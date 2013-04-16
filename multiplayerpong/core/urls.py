from django.conf.urls import patterns, url

from core import views
from django.views.generic import TemplateView

urlpatterns = patterns('',
	url(r'^$', views.index, name='index'),

	# for registration, login, logout requests 
	url(r'^user/$', views.user, name='user'),
	
	# high scores
	url(r'^scores/$', views.scores, name='scores'),
   
   	url(r'^game/$', TemplateView.as_view(template_name="game.html")),

	url(r'^node_api/$', views.node_api, name='node_api'),
)
