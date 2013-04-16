from django.conf.urls import patterns, include, url



urlpatterns = patterns('',
	url("", include("core.urls")),
)
