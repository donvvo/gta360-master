 $(document).ready(function(){
        $('#send_message').click(function(e){
            
            //Stop form submission & check the validation
            e.preventDefault();
            
            // Variable declaration
            var error = false;
            var name = $('#name').val();
            var email = $('#email').val();
			var phone = $('#phone').val();
            var message = $('#message').val();
			
			$('#name,#email,#phone,#message').click(function(){
				$(this).removeClass("error_input");
			});
            
         	// Form field validation
            if(name.length == 0){
                var error = true;
                $('#name').addClass("error_input");
            }else{
                $('#name').removeClass("error_input");
            }
            if(email.length == 0 || email.indexOf('@') == '-1'){
                var error = true;
                $('#email').addClass("error_input");
            }else{
                $('#email').removeClass("error_input");
            }
			if(phone.length == 0){
                var error = true;
                $('#phone').addClass("error_input");
            }else{
                $('#phone').removeClass("error_input");
            }
            if(message.length == 0){
                var error = true;
                $('#message').addClass("error_input");
            }else{
                $('#message').removeClass("error_input");
            }
            
            // If there is no validation error, next to process the mail function
            if(error == false){
               // Disable submit button just after the form processed 1st time successfully.
                $('#send_message').attr({'disabled' : 'true', 'value' : 'Sending...' });

                /* Edit */
                var $contactForm = $('#contact_form')
                
				/* Post Ajax function of jQuery to get all the data from the submission of the form as soon as the form sends the values to email.php*/
                $.post($contactForm.attr('action'), $contactForm.serialize(),function(result){
                    //Check the result set from email.php file.
                    if(result == 'sent'){
                        //If the email is sent successfully, remove the submit button
                         $('#submit').remove();
                        //Display the success message
                        $('#mail_success').fadeIn(500);
                    }else{
                        //Display the error message
                        $('#mail_fail').fadeIn(500);
                        // Enable the submit button again
                        $('#send_message').removeAttr('disabled').attr('value', 'Send The Message');
                    }
                });
            }
        });

     $.validator.addMethod('filesize', function (value, element, param) {
         // param in MB
         return this.optional(element) || (element.files[0].size <= param * 1048576)
     }, 'File size must be less than {0}MB');

     $.validator.addMethod('highlights', function (value, element, param) {
         var displayedNumber = getNumberOfDisplayedItems()
         if (displayedNumber == 4 || displayedNumber == 6) {
             console.log('test')
             return true
         }
         else {
             console.log('asdf')
             return false
         }
     }, "Please select only 4 or 6 highlights")

     function getNumberOfDisplayedItems() {
         return $('#PropertyHighlights input[type=radio][value=display]:checked').length
     }

     $('.theme_form').validate();

     $('#property_highlights_form').validate({
         ignore: [],
         rules: {
             'square_feet_display': {
                 'highlights': true
             }
         },
         onclick: function(element, event) {
             this.form()
         },
         errorPlacement: function(error, element) {
             error.appendTo(element.parents('#PropertyHighlights').find('#highlights-error'))
         },
         errorContainer: '#highlights-error'
     })
    });
