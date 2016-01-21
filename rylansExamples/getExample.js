/**
 * Created by rylanbonnevie on 1/20/16.
 */
var reply = require('./..');

var options = {
    candy: {
        message: 'What is your favorite candy?',
        type: 'string',
        options: ['skittles', 'starbursts', 'chocolate']
    },
    cookies: {
        message: 'What is your favorite cookie?',
        type: 'string',
        allow_empty: false // MUST CHOOSE A COOKIE
    },
    username: {
        default: 'Anonymous',
        type: 'string'
    }
};

reply.get(options, function(err, answers) {
    console.log(answers);
});

