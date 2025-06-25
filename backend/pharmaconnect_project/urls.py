"""
URL configuration for pharmaconnect_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from core.views import AppView, CustomTokenObtainPairView, PharmacySignupView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('core.urls')),

    # Frontend Pages served by Django
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('app/', AppView.as_view(), name='app'),
    path('order/', TemplateView.as_view(template_name='order.html'), name='order'),
    path('pharmacy/dashboard/', TemplateView.as_view(template_name='pharmacy/dashboard.html'), name='pharmacy-dashboard'),
    path('pharmacy/login/', TemplateView.as_view(template_name='pharmacy/login.html'), name='pharmacy-login'),
    path('pharmacy/signup/', PharmacySignupView.as_view(), name='pharmacy-signup'),
    path('user/login/', TemplateView.as_view(template_name='user/login.html'), name='user-login'),
    path('user/orders/', TemplateView.as_view(template_name='user/orders.html'), name='user-orders'),
    path('user/register/', TemplateView.as_view(template_name='user/register.html'), name='user-register-page'),
]

# This is new: it tells Django to serve static files during development
if settings.DEBUG:
    # The path to your static files is in STATICFILES_DIRS, so we use the first entry
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
