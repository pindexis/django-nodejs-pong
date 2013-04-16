

$(document).ready(function() {
		$("#user").live('submit' , function() {
    	$.ajax({ 

                data: $(this).serialize() + "&submit="+ $("input[type=submit][clicked=true]").val(),
                type: $(this).attr('method'), 
                url: $(this).attr('action'), 
                success: function(response) { 
                    $('#header').html(response);
                }
            });
		return false;
		});

		$("#user input[type=submit]").live('click',function() {
   		 $("input[type=submit]", $(this).parents("form")).removeAttr("clicked");
   		 $(this).attr("clicked", "true");
		});
    });


