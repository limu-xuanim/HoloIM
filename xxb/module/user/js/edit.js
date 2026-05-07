$(document).ready(function()
{
     if(v.from == 'admin')
     {
          $.setAjaxForm('#editForm', function(response)
          {
               if(response.result == 'success') location.reload()
          });
     }
     else
     {
          $.setAjaxForm('#editForm',function(response)
          {
               if(response.result == 'success')
               {
                    if(response.locate) $('#ajaxModal').attr('ref', response.locate);
                    $('#blockprofile').find('.refresh-panel').first().click();
                    $.reloadAjaxModal(0);
               }
          });

          $('#submit').click(function()
          {
               var password1        = $('input#password1').val();
               var passwordStrength = computePasswordStrength(password1);

               if($("form input[name=passwordStrength]").length == 0) $('#submit').after("<input type='hidden' name='passwordStrength' value='0' />");
               $("form input[name=passwordStrength]").val(passwordStrength);
          });
     }
});

/**
 * Calculate the strength of password.
 *
 * @param {string} password
 * @returns {number}
 */
function computePasswordStrength(password)
{
     if(password.length == 0) return 0;

     var strength = 0;
     var uniqueChars = '';
     var complexity  = new Array();
     for(i = 0; i < password.length; i++)
     {
          var letter = password.charAt(i);
          var asc = letter.charCodeAt();
          if(asc >= 48 && asc <= 57)
          {
               complexity[2] = 2;
          }
          else if((asc >= 65 && asc <= 90))
          {
               complexity[1] = 2;
          }
          else if(asc >= 97 && asc <= 122)
          {
               complexity[0] = 1;
          }
          else
          {
               complexity[3] = 3;
          }
          if(uniqueChars.indexOf(letter) == -1) uniqueChars += letter;
     }

     if(uniqueChars.length > 4) strength += uniqueChars.length - 4;
     var sumComplexity = 0;
     var complexitySize = 0;
     for(i in complexity)
     {
          complexitySize += 1;
          sumComplexity += complexity[i];
     }
     strength += sumComplexity + (2 * (complexitySize - 1));
     if(password.length < 6 && strength >= 10) strength = 9;

     strength = strength > 29 ? 29 : strength;
     strength = Math.floor(strength / 10);

     return strength;
}
