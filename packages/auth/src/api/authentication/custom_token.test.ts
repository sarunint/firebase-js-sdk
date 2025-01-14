/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { ProviderId } from '../../model/enums';
import { FirebaseError } from '@firebase/util';

import { Endpoint, HttpHeader } from '../';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import { signInWithCustomToken } from './custom_token';

use(chaiAsPromised);

describe('api/authentication/signInWithCustomToken', () => {
  const request = {
    token: 'my-token',
    returnSecureToken: true
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN, {
      providerId: ProviderId.CUSTOM,
      idToken: 'id-token',
      expiresIn: '1000',
      localId: '1234'
    });

    auth.tenantId = 'tenant-id';
    const response = await signInWithCustomToken(auth, request);
    expect(response.providerId).to.eq(ProviderId.CUSTOM);
    expect(response.idToken).to.eq('id-token');
    expect(response.expiresIn).to.eq('1000');
    expect(response.localId).to.eq('1234');
    expect(mock.calls[0].request).to.eql({ ...request, tenantId: 'tenant-id' });
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_CUSTOM_TOKEN,
          errors: [
            {
              message: ServerError.INVALID_CUSTOM_TOKEN
            }
          ]
        }
      },
      400
    );

    await expect(signInWithCustomToken(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The custom token format is incorrect. Please check the documentation. (auth/invalid-custom-token).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
