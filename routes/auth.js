let express = require('express');
let mongoose = require('mongoose');
let router = express.Router();
let jwt = require('jsonwebtoken');
let bcrypt = require('bcrypt');
let User = mongoose.model('User');
let nodemailer = require('nodemailer');
let crypto = require('crypto');
let handlebars = require('handlebars');
let config = require('../.config');
let validator = require('validator');
let utils = require('../utils/utils');
let Account = mongoose.model('Account');
let Types = mongoose.Types;
let rp = require('request-promise');

// configure mailer
let smtpTransport = nodemailer.createTransport(config.emailConfig);

function sendAnEmail(mailOptions) {
    smtpTransport.sendMail(mailOptions, function(error, response) {
        if (error) {
            console.log(error);
        } else {
            console.log(response);
        }
    });
};

// AUTHENTICATION ENDPOINTS 
// root/api/v1/auth/

router.get('/', function(req, res) {
    res.json({
        'state': true,
        'msg': 'Welcome Authentication Page'
    });
});

// therefore this is GET root/api/v1/auth/register
// and so on...

router.get('/register', function(req, res) {
    res.json({
        'state': true,
        'msg': 'Register endpoint',
        'data': {
            'username': 'username',
            'email': 'email',
            'password': 'password',
            'fullName': 'full name'
        }
    });
});

router.post('/register', function(req, res) {

    let captcha_token = req.body.captcha;

    const verification_option = {
        method: 'GET',
        uri: 'https://www.google.com/recaptcha/api/siteverify',
        qs: {
            secret: config.recaptcha_secret_key,
            response: captcha_token
        },
        json: true
    };

    rp(verification_option)
        .then((response) => {
            if (response.success) {
              
                let reserved_usernames = ['google', 'twitter', 'facebook', 'bbc', 'cnn', 'apple', 'samsung',
                    'instagram', 'twitter', 'youtube', 'whatsapp', 'amazon', 'alphabet', 'microsoft', 'sony', 'intel'
                ]

                if (reserved_usernames.includes(req.body.username.trim().toLowerCase())) {
                    return res.json({
                        'state': false,
                        'msg': 'This username is reserved. Please pick a different username'
                    })
                };

                // check if all required were submitted
                if (req.body.username && req.body.email && req.body.password) {

                    let newUser = new User(req.body); //this is safe, because of defined schema
                    newUser.hash_password = bcrypt.hashSync(req.body.password, 10);
                    newUser.save(function(err, user) {
                        if (err) {
                            if (err && err.code === 11000) { // this is Duplicate key error code from MongoDB
                                // all responses ALWAYS return a json object with 'state' and 'msg' fields
                                // that is consistent everywhere.
                                return res.status(500).json({
                                    'state': false,
                                    'msg': 'User with this email address or username exist.'
                                })
                            }
                            return res.status(400).json({
                                'state': false,
                                'msg': err.message
                            });
                        } else {

                            verification_token = crypto.randomBytes(20).toString('hex');

                            User.findByIdAndUpdate({ '_id': user._id }, {
                                verification_token: verification_token,
                                verification_token_expires: Date.now() + 86400000
                            }, {
                                upsert: true, // if doesn't exist, create it.
                                new: true // return the newly added, not old data
                            }, function(err, success) {
                                if (err) {
                                    console.log(err);
                                    return res.status(400).json({
                                        'state': false,
                                        'msg': 'Failed to update verification token. Please try again'
                                    })
                                }

                                // We know you'll success, nti d3n?
                                // console.log(success);

                            });

                            Account.findOneAndUpdate({ 'user': user._id }, {
                                fullName: req.body.fullName,
                                username: req.body.username.toLowerCase().trim()
                            }, {
                                upsert: true,
                                new: true
                            }, function(err, created) {
                                if (err) {
                                    console.log(err);
                                    return res.json({
                                        'state': false,
                                        'msg': err
                                    })
                                }
                                console.log('Account for User created', created);
                            })

                            /**
                             * Reads an html file, and sends it as email, replacing values in it with params
                             */
                            utils.readHTMLFile('./public/email/verify-email.html', function(err, html) {

                                // handlebars replaces parts in html for us
                                let template = handlebars.compile(html);
                                let replacements = {
                                    fullName: user.fullName,
                                    link: config.frontend_url + 'auth/verify-email/' + verification_token,
                                    site_name: config.site_name
                                };

                                let mailOptions = {
                                    from: 'noreply@khophi.co',
                                    to: req.body.email,
                                    subject: `Verify Your Email from ${config.site_name}`,
                                    html: template(replacements) // pass replacement to template for rendering
                                };

                                // ignore sending mail if running in test mode
                                if (req.app.get('env') === 'test') {
                                    // Don't send mail
                                    console.log('Sending no mail, in test mode');
                                } else {
                                    // Send actual email
                                    sendAnEmail(mailOptions);
                                }

                                // We send a response ahead of time. Sending the mail is
                                // Synchronous, and we can't keep user waiting whiles email sends.
                                // We trust the email will deliver.
                                // if any issues, we should check the logs for details in pm2
                                res.status(201).json({
                                    'state': true,
                                    'msg': 'Registration Successful. Kindly check your email for further instructions.'
                                });
                            })
                        }
                    });
                } else {
                    res.json({
                        'state': false,
                        'msg': 'Please include all required credentials, namely, Email, Username and Password'
                    })
                }
            } else {
                return res.json({
                    'state': false,
                    'msg': 'Verification failed. Error: ' + response['error-codes']
                })
            }
        })
        .catch((err) => {
            return res.json({
                'state': false,
                'msg': 'Verification failed. Are you a human?',
                'err': err
            })
        })

});

router.get('/resend-verification', function(req, res) {
    res.json({
        'state': true,
        'msg': 'Resend verification',
        'required': 'email'
    })
});

router.post('/resend-verification', function(req, res) {
    let email = req.body.email;
    if (email) {
        let verification_token = crypto.randomBytes(20).toString('hex');

        User.findOneAndUpdate({ email: email }, {
            verification_token: verification_token,
            verification_token_expires: Date.now() + 86400000
        }, {
            new: true // return the newly added, not old data
        }, function(err, user) {
            if (err) {
                console.log(err);
                return res.json({
                    'state': false,
                    'msg': 'Failed to update verification token. Please try again'
                })
            }

            if (!user) {
                return res.json({
                    'state': false,
                    'msg': 'We do not have any account with this email on our file'
                })
            }

            utils.readHTMLFile('./public/email/verify-email.html', function(err, html) {

                // handlebars replaces parts in html for us
                let template = handlebars.compile(html);
                let replacements = {
                    fullName: user.fullName,
                    link: config.frontend_url + 'auth/verify-email/' + verification_token,
                    site_name: config.site_name
                };

                let mailOptions = {
                    from: 'noreply@khophi.co',
                    to: req.body.email,
                    subject: 'Verify Your Email',
                    html: template(replacements) // pass replacement to template for rendering
                };

                // ignore sending mail if running in test mode
                if (req.app.get('env') === 'test') {
                    // Don't send mail
                    console.log('Sending no mail, in test mode');
                } else {
                    // Send actual email
                    sendAnEmail(mailOptions);
                }

                // We send a response ahead of time. Sending the mail is
                // Synchronous, and we can't keep user waiting whiles email sends.
                // We trust the email will deliver.
                // if any issues, we should check the logs for details in pm2
                res.status(201).json({
                    'state': true,
                    'msg': 'Verification email re-sent. '
                });
            });
        });

    } else {
        res.json({
            'state': false,
            'msg': 'No email address submitted.'
        })
    }
})

router.get('/login', function(req, res) {

    res.json({
        'state': true,
        'msg': 'Login page',
        'data': {
            'email_or_username': 'username',
            'password': 'password'
        }
    });
});

router.post('/login', function(req, res) {

    if (req.body.email_username && req.body.password) {

        let email;
        let username;
        let user_info = req.body.email_username.trim().toLowerCase();

        // Check if email or username
        console.log(validator.isEmail(user_info));

        if (validator.isEmail(user_info)) {
            email = user_info;
            console.log('assigned as email');
        } else {
            username = user_info;
            console.log('assigned as username');
        }

        let password = req.body.password

        // ensure these values were actually sent
        // they're compulsory
        User.findOne({
            $or: [ // login with either 'username' or 'email'
                { email: email },
                { username: username }
            ]
        }, function(err, user) {
            if (err) {
                return ({
                    'state': false,
                    'msg': err
                })
            };

            // TODO: Prevent log in if user is not active
            if (user) {
                if ((typeof(user.is_active)) == 'undefined') {
                    console.log(user.is_active);
                    console.log('Go on from here');
                } else if (!user.is_active) {
                    return res.json({
                        'state': false,
                        'msg': 'This account does not exist. It has been deleted or deactivated.',
                        'is_active': false
                    })
                }
            }

            if (!user) {
                return res.status(401).json({
                    'state': false,
                    'msg': 'Authentication failed. We have no user with such credentials.'
                });
            } else if (user) {
                if (!user.comparePassword(password)) {
                    return res.status(401).json({
                        'state': false,
                        'msg': 'Authentication failed. Wrong email or password. Try again.'
                    });
                } else {
                    user.last_login = Date.now();
                    user.save();
                    if (user.email_verified) {
                        // TODO: Is this the right thing to do?
                        const interestFor = user._id
                        Account.findOne({ user: Types.ObjectId(interestFor) }, function(err, interest) {
                            if (err) {
                                console.log(err);
                                return res.json({
                                    'state': false,
                                    'msg': err
                                })
                            };

                            let token = "JWT" + " " + jwt.sign({
                                'username': user.username,
                                '_id': user._id
                            }, config.secret)

                            return res.json({
                                'state': true,
                                'email_verified': true,
                                'interest': interest,
                                'user': {
                                    '_id': user._id,
                                    'fullName': user.fullName,
                                    'email': user.email,
                                    'username': user.username
                                },
                                'token': token // one week
                            })
                        });
                    } else {
                        return res.json({
                            'state': true,
                            'email_verified': false,
                            'msg': 'Please verify your email address first. See email for instructions'
                        })
                    }
                }
            }
        })
    } else {
        res.json({
            'state': false,
            'msg': "Missing credentials. Provide 'email' or 'username' AND 'password'"
        })
    }
});

router.get('/reset-password', function(req, res) {
    res.json({
        'state': true,
        'msg': 'Password Reset Endpoint',
        'requires': {
            'email': 'email@email.com'
        }
    });
});


router.post('/reset-password-request', function(req, res) {

    let reset_token;
    let user_email = req.body.email;

    console.log(req.body);
    console.log(req.get('Authorization'));
    console.log(req.get('Content-Type'));
    /* 
        data = {
            email: 'email@email.com'
        }    
    */
    if (user_email) {
        User.findOne({ email: user_email }, function(err, user) {
            // If error with the querying.
            if (err) {
                return res.json({
                    'state': false,
                    'msg': err
                })
            }

            // If User doesn't exist
            if (!user) {
                console.log(err);
                return res.json({
                    'state': false,
                    'msg': 'No user found. Check email and try again.'
                });
            }

            reset_token = crypto.randomBytes(20).toString('hex');

            // Set the reset_token to user.
            User.findByIdAndUpdate({ '_id': user._id }, {
                reset_password_token: reset_token,
                reset_password_expires: Date.now() + 86400000
            }, {
                upsert: true,
                new: true
            }, function(err, success) {
                if (err) {
                    console.log(err);
                    return res.json({
                        'state': false,
                        'msg': 'Failed to update Reset Token. Please try again'
                    })
                }
                // console.log(success);
            });

            utils.readHTMLFile('./public/email/reset-request-email.html', function(err, html) {

                // handlebars replaces parts in html for us
                let template = handlebars.compile(html);
                let replacements = {
                    fullName: user.fullName,
                    link: config.frontend_url + 'auth/reset-password/' + reset_token
                };

                let mailOptions = {
                    from: 'noreply@khophi.co',
                    to: user_email,
                    subject: 'Password Reset Request from You',
                    html: template(replacements) // pass replacement to template for rendering
                };

                // Send actual email
                smtpTransport.sendMail(mailOptions, function(error, response) {
                    if (error) {
                        console.log(error);
                        return res.json({
                            'state': false,
                            'msg': error
                        });
                    } else {
                        console.log(response);
                        return res.json({
                            'state': true,
                            'msg': 'Kindly check your email for further instructions'
                        })
                    }
                });

                // It might be best to send the response ahead of time, trusting
                // the email will be delivered, as the waiting for the smtp transport to happen
                // can take time

            })

        })
    } else {
        res.json({
            'state': false,
            'msg': 'No email submitted'
        });
    }

});

router.get('/reset-password', function(req, res) {
    res.json({
        'msg': 'Send a post to update your password.',
        'requires': {
            'reset_token': 'reset_token',
            'new_password': 'new_password',
            'verify_password': 'verify_password',
        }
    })
})

router.post('/reset-password', function(req, res) {
    /*
        data = {
            reset_token: 'reset_token',
            new_password: 'new_password',
            verify_password: 'verify_password',
        }
    */
    User.findOne({
        reset_password_token: req.body.reset_token,
        reset_password_expires: { $gt: Date.now() }
    }, function(err, user) {
        if (!err && user) {
            if (req.body.new_password === req.body.verify_password) {
                user.hash_password = bcrypt.hashSync(req.body.new_password, 10);
                user.reset_password_token = undefined;
                user.reset_password_expires = undefined;
                user.save(function(err) {
                    if (err) {
                        return res.json({
                            'state': false,
                            'msg': err
                        });
                    } else {
                        utils.readHTMLFile('./public/email/confirm-password-email.html', function(err, html) {
                            // handlebars replaces parts in html for us
                            let template = handlebars.compile(html);
                            let replacements = {
                                link: config.site_url + 'auth/login'
                            };

                            let mailOptions = {
                                from: 'noreply@khophi.co',
                                to: user.email,
                                subject: 'Password Reset Request Confirmation',
                                html: template(replacements) // pass replacement to template for rendering
                            };

                            // Send actual email
                            smtpTransport.sendMail(mailOptions, function(error, response) {
                                if (error) {
                                    console.log(error);
                                    return res.json({
                                        'state': false,
                                        'msg': error
                                    });
                                } else {
                                    console.log(response);
                                    return res.json({
                                        'state': true,
                                        'msg': 'Password Successfuly Changed'
                                    })
                                }
                            });

                        })
                    }
                });
            } else {
                return res.json({
                    'state': false,
                    'msg': 'Passwords do not match'
                })
            }
        } else {
            return res.json({
                'state': false,
                'msg': 'Password reset token is invalid or has expired'
            })
        }
    })
})

router.post('/verify-email', function(req, res) {
    // console.log(req.body.verify_token);
    let token = req.body.verify_token;

    if (!token) {
        res.json({
            state: false,
            msg: 'No verification token sent.'
        })
    } else {
        User.findOne({
            verification_token: token,
            verification_token_expires: { $gt: Date.now() }
        }, function(err, user) {
            // console.log(user);
            if (!err && user) {
                user.email_verified = true;
                user.verification_token = undefined;
                user.verification_token_expires = undefined;
                user.save(function(err) {
                    if (err) {
                        return res.json({
                            'state': false,
                            'msg': err
                        })
                    } else {
                        const interestFor = user._id
                        Account.findOne({ user: Types.ObjectId(interestFor) }, function(err, interest) {
                            if (err) {
                                console.log(err);
                                return res.json({
                                    'state': false,
                                    'msg': err
                                })
                            }
                            res.json({
                                'state': true,
                                'msg': 'Your account has been verified successfully. Hurray!',
                                'interest': interest,
                                'user': {
                                    '_id': user._id,
                                    'fullName': user.fullName,
                                    'email': user.email,
                                    'username': user.username
                                },
                                'token': "JWT" + " " + jwt.sign({
                                    'username': user.username,
                                    '_id': user._id
                                }, config.secret)
                            })
                        });
                    }
                })
            } else {
                res.json({
                    state: false,
                    msg: 'Verification token does not exist, is expired or you have verified your account already.'
                })
            }
        })
    }
})

module.exports = router;