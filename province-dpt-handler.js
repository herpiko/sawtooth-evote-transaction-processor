/**
 * Copyright 2016 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ------------------------------------------------------------------------------
 */

'use strict'

const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const {
  InvalidTransaction,
  InternalError
} = require('sawtooth-sdk/processor/exceptions')

const crypto = require('crypto')
const cbor = require('cbor')

const _hash = (x) =>
  crypto.createHash('sha512').update(x).digest('hex').toLowerCase()

const TP_FAMILY = 'provinceDPT'
const TP_NAMESPACE = _hash(TP_FAMILY).substring(0, 6)

const _decodeCbor = (buffer) =>
  new Promise((resolve, reject) =>
    cbor.decodeFirst(buffer, (err, obj) => (err ? reject(err) : resolve(obj)))
  )

const _toInternalError = (err) => {
  let message = (err.message) ? err.message : err
  throw new InternalError(message)
}

const _setEntry = (context, address, stateValue) => {
  let entries = {
    [address]: cbor.encode(stateValue)
  }
  return context.setState(entries)
}

const _applySet = (context, address, name, value) => (possibleAddressValues) => {
  console.log('register new tx :');
  console.log(possibleAddressValues);
  let stateValueRep = possibleAddressValues[address]

  let stateValue
  if (stateValueRep && stateValueRep.length > 0) {
    stateValue = cbor.decodeFirstSync(stateValueRep)
    let stateName = stateValue[name]
    if (stateName) {
      throw new InvalidTransaction(
        `Verb is "set" but Name already in state, Name: ${name} Value: ${stateName}`
      )
    }
  }

  // 'registered' passes checks so store it in the state
  if (!stateValue) {
    stateValue = {}
  }
  stateValue[name] = 'registered';

  return _setEntry(context, address, stateValue)
}

const _applyOperator = (verb, op) => (context, address, name, value) => (possibleAddressValues) => {
  console.log('update existing tx :');
  console.log(possibleAddressValues);
  let stateValueRep = possibleAddressValues[address]
  if (!stateValueRep || stateValueRep.length === 0) {
    throw new InvalidTransaction(`Verb is ${verb} but Name is not in state`)
  }

  let stateValue = cbor.decodeFirstSync(stateValueRep)
  if (stateValue[name] === null || stateValue[name] === undefined) {
    throw new InvalidTransaction(`Verb is ${verb} but Name is not in state`)
  }

  stateValue[name] = verb;
  return _setEntry(context, address, stateValue)
}

const _applyReady = _applyOperator('ready');
const _applyVote = _applyOperator('vote');
const _applyInvalid = _applyOperator('invalid');

class DPTHandler extends TransactionHandler {
  constructor () {
    super(TP_FAMILY, ['1.0'], [TP_NAMESPACE])
  }

  apply (transactionProcessRequest, context) {
    return _decodeCbor(transactionProcessRequest.payload)
      .catch(_toInternalError)
      .then((update) => {
        //
        // Validate the update
        let name = update.Name
        if (!name) {
          throw new InvalidTransaction('Name is required')
        }

        let verb = update.Verb
        if (!verb) {
          throw new InvalidTransaction('Verb is required')
        }

        let value = update.Value
        if (value === null || value === undefined) {
          throw new InvalidTransaction('Value is required')
        }
        // Determine the action to apply based on the verb
        let actionFn
        if (verb === 'registered') {
          actionFn = _applySet
        } else if (verb === 'ready' ) {
          actionFn = _applyReady
        } else if (verb === 'vote') {
          actionFn = _applyVote
        } else if (verb === 'invalid') {
          actionFn = _applyInvalid
        } else {
          throw new InvalidTransaction(`Verb must be registered,ready,vote,invalid not ${verb}`)
        }

        let address = TP_NAMESPACE + _hash(name).slice(-64)

        // Get the current state, for the key's address:
        let getPromise = context.getState([address])

        // Apply the action to the promise's result:
        let actionPromise = getPromise.then(
          actionFn(context, address, name, value)
        )

        // Validate that the action promise results in the correctly set address:
        return actionPromise.then(addresses => {
          if (addresses.length === 0) {
            throw new InternalError('State Error!')
          }
          console.log(`Verb: ${verb} Name: ${name} Value: ${value}`)
        })
      })
  }
}

module.exports = DPTHandler
