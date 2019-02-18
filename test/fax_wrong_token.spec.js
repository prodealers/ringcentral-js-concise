/* eslint-env jest */

/*

https://stackoverflow.com/questions/50291205

> There was a problem in Bearer Token at the time of making Send Fax request.

> Because I was using primary account details for generating Token and at the time of sending FAX I was using extensionid of extension 102 and Bearer Token was generated with Main account extension 101. That is why it was throwing [OutboundFaxes] permission error.

> To send FAX with ExtensionId of extension 102 , then generate the token using subaccount 102 details instead of main account.

*/

import RingCentral from '../src/ringcentral'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import concat from 'concat-stream'
import delay from 'timeout-as-promise'

jest.setTimeout(64000)

const rc = new RingCentral(process.env.RINGCENTRAL_CLIENT_ID, process.env.RINGCENTRAL_CLIENT_SECRET, process.env.RINGCENTRAL_SERVER_URL)

describe('ringcentral', () => {
  test('fax with wrong token', async () => {
    await rc.authorize({
      username: process.env.RINGCENTRAL_USERNAME,
      extension: process.env.RINGCENTRAL_EXTENSION,
      password: process.env.RINGCENTRAL_PASSWORD
    })

    let r = await rc.get('/restapi/v1.0/account/~/extension')
    const otherExtensionId = r.data.records.filter(r => r.extensionNumber === '102')[0].id

    const formData = new FormData()
    formData.append('json', JSON.stringify({ to: [{ phoneNumber: process.env.RINGCENTRAL_RECEIVER }] }), 'test.json')
    formData.append('attachment', fs.createReadStream(path.join(__dirname, 'test.png')), 'test.png')
    formData.pipe(concat({ encoding: 'buffer' }, async data => {
      try {
        const r = await rc.post(`/restapi/v1.0/account/~/extension/${otherExtensionId}/fax`, data, {
          headers: formData.getHeaders()
        })
        expect(r.status).toBe(200)
      } catch (e) {
        expect(e.status).toBe(403)
        expect(e.data.errorCode).toBe('CMN-419')
      }
    }))

    await delay(10000)
    await rc.revoke()
  })
})

/*

Latest error message has been changed to:

{ errorCode: 'CMN-419',
      message:
       'In order to call this API endpoint for another extension, user needs to have [OutboundFaxes] permission granted with extended scope',
      errors:
       [ { errorCode: 'CMN-419',
           message:
            'In order to call this API endpoint for another extension, user needs to have [OutboundFaxes] permission granted with extended scope',
           permissionsName: 'OutboundFaxes' } ],
      permissionsName: 'OutboundFaxes' }
*/

/*
{ errorCode: 'CMN-408',
  message: 'In order to call this API endpoint, user needs to have [OutboundFaxes] permission for requested resource.',
  errors:
    [ { errorCode: 'CMN-408',
        message: 'In order to call this API endpoint, user needs to have [OutboundFaxes] permission for requested resource.',
        permissionName: 'OutboundFaxes' } ],
  permissionName: 'OutboundFaxes' }
*/
