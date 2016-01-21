/**
 * Created by rylanbonnevie on 1/20/16.
 */
var reply = require('./..');

reply.confirm('Do you like the Seahawks?', function(err, positive) {
    var answer = (!err && positive) ? "GO HAWKS!" : 'You are not welcome in Seattle..';
    console.log(answer);
});