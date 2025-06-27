from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserCreateView, PharmacyCreateView, PharmacyListView, 
    PharmacyInventoryListView, InventoryViewSet, OrderViewSet, 
    DrugViewSet, InventorySearchView, project_showcase
)

router = DefaultRouter()
router.register(r'inventory', InventoryViewSet, basename='inventory')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'drugs', DrugViewSet, basename='drug')

urlpatterns = [
    # Authentication URLs
    path('user/login/', UserCreateView.as_view(), name='user-login'),
    path('user/register/', UserCreateView.as_view(), name='user-register-page'),
    path('pharmacy/login/', PharmacyCreateView.as_view(), name='pharmacy-login'),
    path('pharmacy/register/', PharmacyCreateView.as_view(), name='pharmacy-signup-page'),
    
    # API URLs
    path('register/user/', UserCreateView.as_view(), name='user-register'),
    path('register/pharmacy/', PharmacyCreateView.as_view(), name='pharmacy-register'),
    path('pharmacies/', PharmacyListView.as_view(), name='pharmacy-list'),
    path('pharmacies/<int:pk>/inventory/', PharmacyInventoryListView.as_view(), name='pharmacy-inventory-list'),
    path('inventory/search/', InventorySearchView.as_view(), name='inventory-search'),
    path('', include(router.urls)),
]
