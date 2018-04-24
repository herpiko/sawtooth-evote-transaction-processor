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

const { TransactionProcessor } = require('sawtooth-sdk/processor')
const VoteHandler = require('./vote_handler')
const DPTHandler = require('./dpt_handler')

if (!process.argv[2] || !process.argv[3]) {
  console.log('Incomplete arguments. Should be : node index tpfamily tcp::host:4004')
  process.exit(1)
}

const family = process.argv[2]
const address = process.argv[3]

const transactionProcessor = new TransactionProcessor(address)

if (family === 'vote') {
  transactionProcessor.addHandler(new VoteHandler())
} else if (family === 'dpt') {
  transactionProcessor.addHandler(new DPTHandler())
} else {
  console.log('No such tp family : ' + family);
  process.exit(1);
}

transactionProcessor.start()
