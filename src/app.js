const bodyParser = require('body-parser');
const express = require('express');
const request = require('request-promise');

const verify_signature = require('./middleware').verify_signature;

const app = express();

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/widget', (req, res) => {
    res.sendFile('views/widget.html', { root: __dirname });
});

// request expects two different query string parameters,
//  platform: e.g. shopify
//  shop: e.g. example.myshopify.com
app.get('/oauth/redirect', (req, res) => {
    const domain = process.env.CASHIER_DOMAIN;
    const client_id = process.env.CASHIER_CLIENT_ID;

    const platform = req.query.platform;
    const shop = req.query.shop;

    if (typeof platform === 'undefined' || typeof shop === 'undefined') {
        res.status(400).send('Error: "shop" is required');
    }

    const scope = [
        'add_payments',
        'modify_cart',
        'provide_shipping_rates',
    ].join(' ');

    res.redirect(`https://${domain}/api/v1/${platform}/${shop}/oauth/authorize?client_id=${client_id}&scope=${scope}&response_type=code`);
});

// request expects three different query string parameters,
//  platform: e.g. shopify
//  shop: e.g. example.myshopify.com
//  code: a temporary authorization code which you can exchange for a Cashier access token
app.get('/oauth/authorize', (req, res) => {
    const platform = req.query.platform;
    const shop = req.query.shop;
    const code = req.query.code;

    if (typeof code === 'undefined' ||
        typeof platform === 'undefined' ||
        typeof shop === 'undefined') {
        res.status(400).send('Error: "shop" is required');
    }

    const domain = process.env.CASHIER_DOMAIN;
    const requestData = {
        client_id: process.env.CASHIER_CLIENT_ID,
        client_secret: process.env.CASHIER_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
    };

    request({
        url: `https://${domain}/api/v1/${platform}/${shop}/oauth/access_token`,
        method: 'POST',
        json: requestData,
    }).then(resp => {
        //TODO: save access_token in order to perform Cashier API calls

        // at this point the app is free to redirect the user wherever it wants
        // this example redirects back into the Cashier admin
        res.redirect(`https://${domain}/admin/${platform}/${shop}/marketplace`);
    }).catch(err => {
        //TODO: report error
        res.status(500).end();
    });
});

app.post('/oauth/uninstalled', verify_signature, (req, res) => {
    const platform = req.query.platform;
    const shop = req.query.shop;

    //TODO: mark shop as uninstalled in database

    res.send();
});

app.post('/cashier/event', verify_signature, (req, res) => {
    //res.send(req.body.event);
    const actions = handleEvent(req);

    res.send({
        success: true,
        actions: actions,
    });
});

app.post('/payment/preauth', verify_signature, (req, res) => {
    if (req.body.payment.value >= 100000) {
        res.send({
            success: false,
            error: 'payment exceeds maximum value',
        });
    } else {
        res.send({
            success: true,
            reference_id: 'payment-12345',
        });
    }
});

app.post('/payment/capture', verify_signature, (req, res) => {
    res.send({
        success: true,
        reference_id: 'payment-12345',
    });
});

app.post('/payment/refund', verify_signature, (req, res) => {
    res.send({
        success: true,
        reference_id: 'payment-12345',
    });
});

function handleEvent(req) {
    switch (req.body.event) {
        case 'initialize_checkout':
            return handleInitializeCheckout(req);
        case 'app_hook':
            return handleAppHook(req);
        default:
            return [];
    }
};

function handleInitializeCheckout(req) {
    return [
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
    ];
};

function handleAppHook(req) {
    switch (req.body.properties.hook) {
        case 'apply_discount':
            return [
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
                        text: 'You\'re welcome',
                        click_hook: 'already_used',
                        icon: 'https://via.placeholder.com/50x50.png',
                    },
                },
            ];
        case 'already_used':
            return [
                {
                    type: 'APP_UPDATE_WIDGET',
                    data: {
                        name: 'my_discount_widget',
                        type: 'app_hook',
                        position: 'discount',
                        text: 'You\'ve already used the discount',
                        click_hook: 'already_used',
                        icon: 'https://via.placeholder.com/50x50.png',
                    },
                },
            ];
        case 'add_payment':
            return [
                {
                    type: 'ADD_PAYMENT',
                    data: {
                        currency: req.body.order.currency,
                        value: req.body.order.order_total,
                        line_text: 'Payment via honor system',
                        gateway_name: 'Honor System',
                    },
                },
            ];
        default:
            return [];
    }
};

module.exports = app;
