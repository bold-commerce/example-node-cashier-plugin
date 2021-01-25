require('dotenv').config({ path: '.env.testing' });

const nock = require('nock');
const request = require('supertest');

const app = require('./app');

// TODO: Mock Middleware
// const verify_signature = require('../middleware').verify_signature;
// jest.mock('../middleware');
// verify_signature.mockImplementation((req, res, next) => next());

describe('app', () => {
    afterEach(async() => {
        nock.cleanAll();
    });

    describe('GET /', () => {
        it('responds with "Hello World!"', () => {
            return request(app)
                .get('/')
                .expect(200)
                .expect('Hello World!');
        });
    });

    describe('GET /oauth/redirect', () => {
        it('responds with status 400 when "platform" is missing', () => {
            return request(app)
                .get('/oauth/redirect')
                .query({
                    shop: 'example.myshopify.com',
                })
                .expect(400);
        });

        it('responds with status 400 when "shop" is missing', () => {
            return request(app)
                .get('/oauth/redirect')
                .query({
                    platform: 'shopify',
                })
                .expect(400);
        });

        it('responds with redirect', () => {
            return request(app)
                .get('/oauth/redirect')
                .query({
                    platform: 'shopify',
                    shop: 'example.myshopify.com',
                })
                .expect(302)
                .expect(
                    'Location',
                    'https://cashier.boldcommerce.com/api/v1/shopify/example.myshopify.com/oauth/authorize?client_id=example-client-id&scope=add_payments%20modify_cart%20provide_shipping_rates&response_type=code'
                );
        });
    });

    //TODO: Mock Middleware
    describe.skip('GET /settings', () => {
        it('responds with status 400 when "token" is missing', () => {
            return request(app)
                .get('/settings?platform=shopify&shop=example.myshopify.com')
                .expect(400);
        });

        it('responds with success when "token" is present', () => {
            const token = 'fsdf34543rsdf232f';

            return request(app)
                .get('/settings?token=' + token)
                .send()
                .expect(200)
                .expect(function(res) {
                    res.body.token = token;
                });
        });
    });

    //TODO: Mock Middleware
    describe.skip('POST /settings', () => {
        it('responds with status 400 when "token" is missing', () => {
            return request(app)
                .post('/settings')
                .send()
                .expect(400);
        });

        it('responds with success', () => {
            const token = 'fsdf34543rsdf232f';

            return request(app)
                .post('/settings?token=' + token)
                .expect(200)
                .expect(function(res) {
                    res.body.token = token;
                });
        });
    });

    //TODO: Mock Middleware
    describe.skip('POST /shipping', () => {
        it('responds with success', () => {
            return request(app)
              .post('/shipping')
              .expect(200)
              .expect({
                  name: 'My Custom Shipping Override',
                  rates: [
                      {
                          line_text: 'EXTERNAL ECONOMY SHIPPING 5-7 BUSINESS DAYS',
                          value: 11.5,
                      },
                      {
                          line_text: 'EXTERNAL SHIPPING SOURCE OVERNIGHT EXPRESS',
                          value: 15.5,
                      },
                  ],
              });
        });
    });

    describe('GET /oauth/authorize', () => {
        it('responds with status 400 when "code" is missing', () => {
            return request(app)
                .get(
                    '/oauth/authorize'
                )
                .query({
                    platform: 'shopify',
                    shop: 'example.myshopify.com',
                })
                .expect(400);
        });

        it('responds with status 400 when "platform" is missing', () => {
            return request(app)
                .get('/oauth/authorize')
                .query({
                    code: 'example-code',
                    shop: 'example.myshopify.com',
                })
                .expect(400);
        });

        it('responds with status 400 when "shop" is missing', () => {
            return request(app)
                .get('/oauth/authorize')
                .query({
                    code: 'example-code',
                    platform: 'shopify',
                })
                .expect(400);
        });

        it('responds with status 500 when "invalid_scope" error occurs', () => {
            nock('https://cashier.boldcommerce.com')
                .post(
                    '/api/v1/shopify/example.myshopify.com/oauth/access_token',
                    {
                        client_id: 'example-client-id',
                        client_secret: 'example-client-secret',
                        code: 'example-code',
                        grant_type: 'authorization_code',
                    }
                )
                .reply(400, {
                    error: 'invalid_scope',
                });

            return request(app)
                .get('/oauth/authorize')
                .query({
                    code: 'example-code',
                    platform: 'shopify',
                    shop: 'example.myshopify.com',
                })
                .expect(500);
        });

        it('responds with redirect', () => {
            nock('https://cashier.boldcommerce.com')
                .post(
                    '/api/v1/shopify/example.myshopify.com/oauth/access_token',
                    {
                        client_id: 'example-client-id',
                        client_secret: 'example-client-secret',
                        code: 'example-code',
                        grant_type: 'authorization_code',
                    }
                )
                .reply(200, {
                    shop: 'example.myshopify.com',
                    platform: 'shopify',
                    access_token: 'example-access-token',
                    scope: 'modify_cart provide_shipping_rates',
                    token_type: 'bearer',
                });

            return request(app)
                .get('/oauth/authorize')
                .query({
                    code: 'example-code',
                    platform: 'shopify',
                    shop: 'example.myshopify.com',
                })
                .expect(302)
                .expect(
                    'Location',
                    'https://cashier.boldcommerce.com/admin/shopify/example.myshopify.com/marketplace'
                );
        });
    });

    //TODO: Mock Middleware
    describe.skip('POST /oauth/uninstalled', () => {
        it('responds with status 200', () => {
            return request(app)
                .post('/oauth/uninstalled')
                .query({
                    platform: 'shopify',
                    shop: 'example.myshopify.com',
                })
                .expect(200);
        });
    });

    //TODO: Mock Middleware
    describe.skip('POST /cashier/event', () => {
        it('responds with no actions for unrecognized event', () => {
            return request(app)
                .post('/cashier/event')
                .send({
                    event: 'fake_event',
                })
                .expect(200)
                .expect({
                    success: true,
                    actions: [],
                });
        });

        it('responds with no actions for unrecognized hook', () => {
            return request(app)
                .post('/cashier/event')
                .send({
                    event: 'app_hook',
                    properties: {
                        hook: 'fake_hook',
                    },
                })
                .expect(200)
                .expect({
                    success: true,
                    actions: [],
                });
        });

        it('responds with actions for event: "initialize_checkout"', () => {
            return request(app)
                .post('/cashier/event')
                .send({
                    event: 'initialize_checkout',
                })
                .expect(200)
                .expect({
                    success: true,
                    actions: [
                        {
                            type: 'APP_UPDATE_WIDGET',
                            data: {
                                name: 'my_payments_widget',
                                type: 'iframe',
                                position: 'payments',
                                source: process.env.APP_URL + '/widget',
                                frame_origin: process.env.APP_URL,
                            },
                        },
                        {
                            type: 'APP_UPDATE_WIDGET',
                            data: {
                                name: 'my_discount_widget',
                                type: 'app_hook',
                                position: 'discount',
                                text: 'Discount 5%',
                                icon: 'https://via.placeholder.com/50x50.png',
                                click_hook: 'apply_discount',
                            },
                        },
                        {
                            type: 'APP_UPDATE_WIDGET',
                            data: {
                                name: 'my_payment_method',
                                type: 'app_hook',
                                position: 'payment_gateway',
                                text: 'Pay via the honor system',
                                click_hook: 'add_payment',
                            },
                        },
                        {
                            type: 'OVERRIDE_SHIPPING',
                            data: {
                                url: process.env.APP_URL + '/shipping',
                            },
                        },
                    ],
                });
        });

        it('responds with actions for hook: "apply_discount"', () => {
            return request(app)
                .post('/cashier/event')
                .send({
                    event: 'app_hook',
                    properties: {
                        hook: 'apply_discount',
                    },
                })
                .expect(200)
                .expect({
                    success: true,
                    actions: [
                        {
                            type: 'DISCOUNT_CART',
                            data: {
                                discountPercentage: 5,
                                transformationMessage: 'Money saved',
                            },
                        },
                        {
                            type: 'APP_UPDATE_WIDGET',
                            data: {
                                name: 'my_discount_widget',
                                type: 'app_hook',
                                position: 'discount',
                                text: "You're welcome",
                                click_hook: 'already_used',
                                icon: 'https://via.placeholder.com/50x50.png',
                            },
                        },
                    ],
                });
        });

        it('responds with actions for hook: "already_used"', () => {
            return request(app)
                .post('/cashier/event')
                .send({
                    event: 'app_hook',
                    properties: {
                        hook: 'already_used',
                    },
                })
                .expect(200)
                .expect({
                    success: true,
                    actions: [
                        {
                            type: 'APP_UPDATE_WIDGET',
                            data: {
                                name: 'my_discount_widget',
                                type: 'app_hook',
                                position: 'discount',
                                text: "You've already used the discount",
                                click_hook: 'already_used',
                                icon: 'https://via.placeholder.com/50x50.png',
                            },
                        },
                    ],
                });
        });

        it('responds with actions for hook: "add_payment"', () => {
            return request(app)
                .post('/cashier/event')
                .send({
                    event: 'app_hook',
                    properties: {
                        hook: 'add_payment',
                    },
                    order: {
                        order_total: 500,
                        currency: 'CAD',
                    },
                })
                .expect(200)
                .expect({
                    success: true,
                    actions: [
                        {
                            type: 'ADD_PAYMENT',
                            data: {
                                currency: 'CAD',
                                value: 500,
                                line_text: 'Payment via honor system',
                                gateway_name: 'Honor System',
                            },
                        },
                    ],
                });
        });
    });

    //TODO: Mock Middleware
    describe.skip('POST /payment/preauth', () => {
        it('responds with success for value below $1000', () => {
            return request(app)
                .post('/payment/preauth')
                .send({
                    order: {},
                    payment: {
                        reference_id: '',
                        currency: 'CAD',
                        value: 500,
                    },
                })
                .expect(200)
                .expect({
                    success: true,
                    reference_id: 'payment-12345',
                });
        });
    });

    //TODO: Mock Middleware
    describe.skip('POST /payment/preauth', () => {
        it('responds with failure for value above $1000', () => {
            return request(app)
                .post('/payment/preauth')
                .send({
                    order: {},
                    payment: {
                        reference_id: '',
                        currency: 'CAD',
                        value: 100000,
                    },
                })
                .expect(200)
                .expect({
                    success: false,
                    error: 'payment exceeds maximum value',
                });
        });
    });

    //TODO: Mock Middleware
    describe.skip('POST /payment/capture', () => {
        it('responds with success', () => {
            return request(app)
                .post('/payment/capture')
                .send({
                    order: {},
                    payment: {
                        reference_id: 'payment-12345',
                        currency: 'CAD',
                        value: 500,
                    },
                })
                .expect(200)
                .expect({
                    success: true,
                    reference_id: 'payment-12345',
                });
        });
    });

    //TODO: Mock Middleware
    describe.skip('POST /payment/refund', () => {
        it('responds with success', () => {
            return request(app)
                .post('/payment/refund')
                .send({
                    order: {},
                    payment: {
                        reference_id: 'payment-12345',
                        currency: 'CAD',
                        value: 500,
                    },
                })
                .expect(200)
                .expect({
                    success: true,
                    reference_id: 'payment-12345',
                });
        });
    });
});
