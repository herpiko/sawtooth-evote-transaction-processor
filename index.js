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
const ProvinceDPTHandler = require('./province-dpt-handler');
const ProvinceVoteHandler = require('./province-vote-handler');
const LocalVoteHandler = require('./local-vote-handler')
const LocalDPTHandler = require('./local-dpt-handler')
const CandidatesHandler = require('./local-candidates-handler')

if (!process.argv[2] || !process.argv[3]) {
  console.log('Incomplete arguments. Should be : node index tpfamily tcp://host:4004')
  process.exit(1)
}

const family = process.argv[2]
const address = process.argv[3]

const transactionProcessor = new TransactionProcessor(address)
console.log('current tp family : ' + family);

switch(family) {
  case 'localVote':
    transactionProcessor.addHandler(new LocalVoteHandler())
    transactionProcessor.start();
    break;
  case 'localDPT':
    transactionProcessor.addHandler(new LocalDPTHandler())
    transactionProcessor.addHandler(new CandidatesHandler())
    transactionProcessor.start();
    break;
  case 'provinceDPT':
    transactionProcessor.addHandler(new ProvinceDPTHandler())
    transactionProcessor.start();
    break;
  case 'provinceVote':
    transactionProcessor.addHandler(new ProvinceVoteHandler())
    transactionProcessor.start();
    break;
  default :
    console.log('No such tp family : ' + family);
    process.exit(1);
}

