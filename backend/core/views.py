from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import CustomUser, Pharmacy, Inventory, Order, Drug
from .serializers import UserSerializer, PharmacySerializer, PharmacyListSerializer, InventorySerializer, OrderSerializer, CustomTokenObtainPairSerializer, DrugSerializer, InventorySearchSerializer
from django.views.generic import TemplateView
from django.shortcuts import render
from .permissions import IsPharmacyUser, IsOwnerOrPharmacy
from rest_framework_simplejwt.views import TokenObtainPairView
from django.conf import settings

class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view that uses our serializer which supports user_type"""
    serializer_class = CustomTokenObtainPairSerializer

class UserCreateView(generics.CreateAPIView):
    """Create a new user in the system"""
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Allow anyone to register


class PharmacyCreateView(generics.CreateAPIView):
    """Create a new pharmacy user and profile in the system"""
    queryset = Pharmacy.objects.all()
    serializer_class = PharmacySerializer
    permission_classes = [AllowAny]  # Allow anyone to register


class PharmacyListView(generics.ListAPIView):
    """Return a list of all pharmacies for the map."""
    queryset = Pharmacy.objects.all()
    serializer_class = PharmacyListSerializer
    permission_classes = [IsAuthenticated]


class PharmacyInventoryListView(generics.ListAPIView):
    """Return a list of all inventory items for a specific pharmacy."""
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]  # Allow any authenticated user to see inventory

    def get_queryset(self):
        """
        This view should return a list of all the inventory items
        for the pharmacy as determined by the pk portion of the URL.
        """
        pharmacy_pk = self.kwargs['pk']
        return Inventory.objects.filter(pharmacy_id=pharmacy_pk)


class InventoryViewSet(viewsets.ModelViewSet):
    """Manage inventory items for the logged-in pharmacy."""
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsPharmacyUser]

    def get_queryset(self):
        """This view should return a list of all the inventory items
        for the currently authenticated pharmacy user."""
        return Inventory.objects.filter(pharmacy=self.request.user.pharmacy_profile)

    def perform_create(self, serializer):
        """Associate the inventory item with the logged-in pharmacy user."""
        serializer.save(pharmacy=self.request.user.pharmacy_profile)


class DrugViewSet(viewsets.ModelViewSet):
    """Manage drugs in the system."""
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    permission_classes = [IsAuthenticated, IsPharmacyUser]


class InventorySearchView(generics.ListAPIView):
    """
    Search for drugs across all pharmacies' inventories.
    Accepts a 'drug_name' query parameter.
    """
    serializer_class = InventorySearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter inventory based on the 'drug_name' query parameter.
        """
        queryset = Inventory.objects.select_related('drug', 'pharmacy').all()
        drug_name = self.request.query_params.get('drug_name', None)
        if drug_name:
            # Filter by drug name, case-insensitive
            queryset = queryset.filter(drug__name__icontains=drug_name)
        return queryset


class OrderViewSet(viewsets.ModelViewSet):
    """Manage orders for customers and pharmacies."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrPharmacy]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            return Order.objects.filter(customer=user)
        elif user.user_type == 'pharmacy':
            return Order.objects.filter(pharmacy__user=user)
        return Order.objects.none() # Should not happen for authenticated users

    def perform_create(self, serializer):
        # Customers create orders
        if self.request.user.user_type == 'customer':
            serializer.save(customer=self.request.user)
        else:
            # Pharmacies should not be able to create orders directly this way
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Pharmacies cannot create orders through this endpoint.')

    # Pharmacies can update order status (e.g., to 'processing' or 'completed')
    # Customers should not be able to update orders directly, except maybe to cancel.
    # This can be refined with custom actions if needed.
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update'] and self.request.user.user_type == 'pharmacy':
            # Potentially a different serializer for pharmacy updates if needed
            # For now, allow pharmacy to update status using the main serializer
            pass 
        return OrderSerializer


class PharmacySignupView(TemplateView):
    template_name = 'pharmacy/signup.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['mapbox_access_token'] = settings.MAPBOX_ACCESS_TOKEN
        return context


class AppView(TemplateView):
    template_name = 'app.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['mapbox_access_token'] = settings.MAPBOX_ACCESS_TOKEN
        return context


