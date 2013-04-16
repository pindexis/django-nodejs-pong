from django.shortcuts import render
from django import forms
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
from django.http import HttpResponse
from django.contrib.sessions.models import Session
from django.views.decorators.csrf import csrf_exempt

def index(request):
	user = request.user
	context = {}
	if user.is_authenticated() and user.id is not 1:
		prof = user.get_profile()
		context = {'username':user.username, 'wins':prof.wins, 'losses':prof.losses,}
	else:
		context = {'form': UserForm()}
	return render(request, 'core/index.html', context)



@require_http_methods(["POST"])
def user(request):
	context = {}
	if request.POST['submit'] == 'logout':
		# make sure the user is logged in
		logout(request)
		context = {'form': UserForm(),'message':"Logged out"}		
	else :
		form = UserForm(request.POST) 
		if form.is_valid():
			username = form.cleaned_data['username']
			password = form.cleaned_data['password']

			if request.POST['submit'] == 'register':
				if User.objects.filter(username=username).count():
					return render(request, 'core/header.html', {'form': UserForm(), 'message': "User Already exists"})
				user = User.objects.create_user(username, 'noneeded@am.gt', password)
				user.save()
					
			user = authenticate(username=username, password=password)
			if user is not None:
				if user.is_active:
					login(request, user)
					prof = user.get_profile()
					context = {'username':user.username, 'wins':prof.wins, 'losses':prof.losses}	
				else:
					context = {'form': UserForm(), 'message': "Account Disabled."}
			else:
				context = {'form': UserForm(), 'message': "Invalid username or password."}
		else:
			context = {'form': UserForm(), 'message': "Invalid inputs"}
	return render(request, 'core/header.html', context)

	
def scores(request):
	users_list = [(user.username, user.get_profile())  for user in User.objects.exclude(id=1)]
	users_list = sorted(users_list,key=lambda x:((x[1].wins - x[1].losses)),reverse=True)
	return render(request, 'core/highscores.html', {'users_list': [{ "username" : u[0],"score" : (u[1].wins - u[1].losses)} for u in  users_list[:5]]})

@csrf_exempt
@require_http_methods(["POST"])
def node_api(request):
	action = request.POST['action']
	if (action == "validatesession"):
		try:
			session = Session.objects.get(session_key=request.POST.get('session',''))
			uid = session.get_decoded().get('_auth_user_id')
			user = User.objects.get(pk=uid)
			return HttpResponse(user.username)
		except:
			return HttpResponse("INVALID")
	elif (action == "gameover"):
		wuser = User.objects.get(username=request.POST["winner"])
		luser = User.objects.get(username=request.POST["looser"])
		wuserprof = wuser.get_profile()
		wuserprof.wins = wuserprof.wins + 1
		wuserprof.save()
		luserprof = luser.get_profile()
		luserprof.losses = luserprof.losses + 1
		luserprof.save()
		return HttpResponse("")
	else:
		return HttpResponse("Invalid request")

class UserForm(forms.Form):
	username = forms.CharField(max_length=100)
	password = forms.CharField(max_length=100)


