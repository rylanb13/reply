var rl, readline = require('readline');
/*
    * This method either retrieves an existing interface or creates one
    * @param (stream) recieves input from the users keyboard
    * @param (stream) print to the screen
*/
var get_interface = function(stdin, stdout) {
  if (!rl) rl = readline.createInterface(stdin, stdout);
  else stdin.resume(); // interface exists
  return rl;
};


/*
    * Confirms whether or not a question is being answered as yes
    * @param {String} displays a message for the user
    * @param {function} callback(err, answer) completes after the user has input the information needed
*/
var confirm = exports.confirm = function(message, callback) {
  var question = {
    'reply': {
      type: 'confirm',
      message: message,
      default: 'yes'
    }
  };

  get(question, function(err, answer) {
    if (err) return callback(err);
    callback(null, answer.reply === true || answer.reply == 'yes');
  });

};

var get = exports.get = function(options, callback) {

    if (!callback) return; // no point in continuing

    if (typeof options != 'object')
        return callback(new Error("Please pass a valid options object."));

// Records a list of answers inputted by the user
    var answers = {},
        stdin = process.stdin,
        stdout = process.stdout,
        fields = Object.keys(options);

    // Closes the propmt
  var done = function() {
    close_prompt();
    callback(null, answers);
  };

    // stops the input input streams and closes the readline
  var close_prompt = function() {
    stdin.pause();
    if (!rl) return;
    rl.close();
    rl = null;
  };
/*
    *  Default value in case user just presses the enter key. Can be a value or a function that returns a value.
    * @param {Object} key - it retrieves the type of object within the options.
    * @param {String} partial_answers - prompts the value of the partial answer
    * @return - Returns the default answers for the chosen options
 */
  var get_default = function(key, partial_answers) {
    if (typeof options[key] == 'object')
      return typeof options[key].default == 'function' ? options[key].default(partial_answers) : options[key].default;
    else
      return options[key];
  };

    /*
        * Guesses the closest answer within the options based on users input.
        * @param (String) reply - input of the user as a response from the prompted question
        * @return - returns the guessed user input
     */
  var guess_type = function(reply) {

    if (reply.trim() == '') // if no reply, refers to default
      return;
    else if (reply.match(/^(true|y(es)?)$/)) // guesses for inputs relating to 'yes'
      return true;
    else if (reply.match(/^(false|n(o)?)$/)) // guesses for inputs relating to 'no'
      return false;
    else if ((reply*1).toString() === reply) // guesses for inputs that are numbers
      return reply*1;

    return reply;
  };
/*
    * Tests the users input against both the regex and any other values of the related option
    * @param {object} key - refers to a specific key in the options
    * @param {String} answer - User's inputted answer for the prompted question
    * @return - returns whether not the user's answer exists
 */
  var validate = function(key, answer) {

    if (typeof answer == 'undefined')
      return options[key].allow_empty || typeof get_default(key) != 'undefined';
    else if(regex = options[key].regex)
      return regex.test(answer);
    else if(options[key].options)
      return options[key].options.indexOf(answer) != -1;
    else if(options[key].type == 'confirm')
      return typeof(answer) == 'boolean'; // answer was given so it should be
    else if(options[key].type && options[key].type != 'password')
      return typeof(answer) == options[key].type;

    return true;

  };
/*
    * Displays an error message when user's input a non-valid value and displays which options are available
    * @param {object} key - used to find correct values in the options
 */
  var show_error = function(key) {
    var str = options[key].error ? options[key].error : 'Invalid value.';

    if (options[key].options)
        str += ' (options are ' + options[key].options.join(', ') + ')';

    stdout.write("\033[31m" + str + "\033[0m" + "\n");
  };

    /*
        * Dipslays the message corresponding to the option in the current key
        * @param {object} key - current object faced with the user
     */
  var show_message = function(key) {
    var msg = '';

    if (text = options[key].message)
      msg += text.trim() + ' ';

    if (options[key].options)
      msg += '(options are ' + options[key].options.join(', ') + ')';

    if (msg != '') stdout.write("\033[1m" + msg + "\033[0m\n");
  };

  /*
        * Masks password fields with '*', with support for backspace keystrokes.
    */
    var wait_for_password = function(prompt, callback) {

        var buf = '',
            mask = '*';

        var keypress_callback = function(c, key) {

          if (key && (key.name == 'enter' || key.name == 'return')) {
            stdout.write("\n");
            stdin.removeAllListeners('keypress');
            // stdin.setRawMode(false);
            return callback(buf);
          }

          if (key && key.ctrl && key.name == 'c')
            close_prompt();

          if (key && key.name == 'backspace') {
            buf = buf.substr(0, buf.length-1);
            var masked = '';
            for (i = 0; i < buf.length; i++) { masked += mask; }
            stdout.write('\r\033[2K' + prompt + masked);
          } else {
            stdout.write(mask);
            buf += c;
          }

        };

    stdin.on('keypress', keypress_callback);
  };
/*
    * Validates the user's reply on the question, then moves on to the next question
    * @param index - keeps track of which question is currently in use
    * @param curr_key - user's current input
    * @param fallback - refers to the default answer if user doesn't respond
    * @param reply - users input to the prompt
 */
 */
  var check_reply = function(index, curr_key, fallback, reply) {
    var answer = guess_type(reply);
    var return_answer = (typeof answer != 'undefined') ? answer : fallback; // default

    if (validate(curr_key, answer))
      next_question(++index, curr_key, return_answer); // moves on to next question if valid answer
    else
      show_error(curr_key) || next_question(index); // repeats current
  };
/*
     * Checks if the conditions/dependencies are met
     * @param conds - required condition for the dependency
     * @return - whether or not the dependency was met
 */
  var dependencies_met = function(conds) {
    for (var key in conds) {
      var cond = conds[key];
      if (cond.not) { // object, inverse
        if (answers[key] === cond.not)
          return false;
      } else if (cond.in) { // array 
        if (cond.in.indexOf(answers[key]) == -1) 
          return false;
      } else {
        if (answers[key] !== cond)
          return false; 
      }
    }

    return true;
  };
/*
    * Prompts next question in the list if the current question has been answered
     * @param index - keeps track of which question is currently in use
     * @param prev_key - keeps track of the user's input on the previous question
     * @param answer - user's current input
     * @return - current answer then next question
 */
  var next_question = function(index, prev_key, answer) {
    if (prev_key) answers[prev_key] = answer;

    var curr_key = fields[index];
    if (!curr_key) return done();

    if (options[curr_key].depends_on) {
      if (!dependencies_met(options[curr_key].depends_on))
        return next_question(++index, curr_key, undefined);
    }

    var prompt = (options[curr_key].type == 'confirm') ?
      ' - yes/no: ' : " - " + curr_key + ": ";

    var fallback = get_default(curr_key, answers);
    if (typeof(fallback) != 'undefined' && fallback !== '')
      prompt += "[" + fallback + "] ";

    show_message(curr_key);

    if (options[curr_key].type == 'password') {

      var listener = stdin._events.keypress; // to reassign down later
      stdin.removeAllListeners('keypress');

      // stdin.setRawMode(true);
      stdout.write(prompt);

      wait_for_password(prompt, function(reply) {
        stdin._events.keypress = listener; // reassign
        check_reply(index, curr_key, fallback, reply)
      });

    } else {

      rl.question(prompt, function(reply) {
        check_reply(index, curr_key, fallback, reply);
      });

    }

  };

  rl = get_interface(stdin, stdout);
  next_question(0);

  rl.on('close', function() {
    close_prompt(); // just in case

    var given_answers = Object.keys(answers).length;
    if (fields.length == given_answers) return;

    var err = new Error("Cancelled after giving " + given_answers + " answers.");
    callback(err, answers);
  });

};
