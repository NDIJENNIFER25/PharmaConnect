from rest_framework import serializers
import requests
from django.conf import settings
from .models import CustomUser, Pharmacy, Drug, Inventory, Order, OrderItem
from django.conf import settings
from mapbox import Geocoder
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'password', 'user_type')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            user_type=validated_data.get('user_type', 'customer')
        )
        return user

    def update(self, instance, validated_data):
        """Update user, setting the password correctly if it is provided."""
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)

        if password:
            user.set_password(password)
            user.save()

        return user


class PharmacySerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Pharmacy
        fields = ('user', 'name', 'address', 'phone_number', 'latitude', 'longitude')

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['user_type'] = 'pharmacy'
        user_serializer = UserSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()

        # Automatic geocoding removed. Coordinates are now provided directly.
        pharmacy = Pharmacy.objects.create(user=user, **validated_data)
        return pharmacy

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            UserSerializer().update(instance.user, user_data)

        # Automatic geocoding removed. Coordinates are updated directly if provided.
        return super().update(instance, validated_data)


class DrugSerializer(serializers.ModelSerializer):
    """Serializer for the Drug model."""
    class Meta:
        model = Drug
        fields = ('id', 'name', 'description', 'manufacturer', 'price')


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    user_type = serializers.CharField(required=False)
    
    def validate(self, attrs):
        # Extract credentials from the request
        username = attrs.get('username')
        password = attrs.get('password')
        user_type = attrs.get('user_type')
        
        # Authenticate with user_type if provided
        if user_type:
            user = authenticate(self.context['request'], username=username, password=password, user_type=user_type)
        else:
            user = authenticate(self.context['request'], username=username, password=password)
        
        if user is None:
            raise serializers.ValidationError('No active account found with the given credentials')
        
        # Continue with the standard JWT token generation
        refresh = self.get_token(user)
        
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
        
        return data


class InventorySerializer(serializers.ModelSerializer):
    """
    Serializer for inventory items. Handles nested drug creation.
    """
    # For read operations, show the full drug details.
    drug = DrugSerializer()
    pharmacy_name = serializers.CharField(source='pharmacy.name', read_only=True)

    class Meta:
        model = Inventory
        fields = ('id', 'drug', 'quantity', 'pharmacy_name', 'updated_at')
        read_only_fields = ('id', 'updated_at')

    def create(self, validated_data):
        drug_data = validated_data.pop('drug')
        # Find the drug by name or create it if it doesn't exist.
        drug, created = Drug.objects.get_or_create(
            name=drug_data['name'],
            defaults={
                'description': drug_data.get('description', ''),
                'manufacturer': drug_data.get('manufacturer', ''),
                'price': drug_data.get('price', 0)
            }
        )
        # Create the inventory item with the retrieved or newly created drug.
        inventory = Inventory.objects.create(drug=drug, **validated_data)
        return inventory


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items."""
    drug = DrugSerializer(read_only=True)
    drug_id = serializers.PrimaryKeyRelatedField(
        queryset=Drug.objects.all(), source='drug', write_only=True
    )

    class Meta:
        model = OrderItem
        fields = ('id', 'drug', 'drug_id', 'quantity', 'price_at_time_of_order')
        read_only_fields = ('id', 'price_at_time_of_order') # Price set at order creation


class PharmacyListSerializer(serializers.ModelSerializer):
    """Serializer for listing pharmacies on the map."""
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Pharmacy
        fields = ('id', 'name', 'address', 'phone_number', 'latitude', 'longitude')


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for orders, includes nested order items."""
    items = OrderItemSerializer(many=True)
    customer = UserSerializer(read_only=True) # Read-only, set automatically
    pharmacy = PharmacyListSerializer(read_only=True) # Read-only, set based on first item's pharmacy or explicit pharmacy_id
    pharmacy_id = serializers.PrimaryKeyRelatedField(
        queryset=Pharmacy.objects.all(), source='pharmacy', write_only=True
    )

    class Meta:
        model = Order
        fields = (
            'id', 'customer', 'pharmacy', 'pharmacy_id', 'status', 
            'total_price', 'items', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'customer', 'total_price', 'created_at', 'updated_at')

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        total_price = 0
        for item_data in items_data:
            drug = item_data['drug']
            quantity = item_data['quantity']
            price_at_time_of_order = drug.price # Capture current price
            OrderItem.objects.create(order=order, drug=drug, quantity=quantity, price_at_time_of_order=price_at_time_of_order)
            total_price += (price_at_time_of_order * quantity)
        order.total_price = total_price
        order.save()
        return order


class InventorySearchSerializer(serializers.ModelSerializer):
    """
    Serializer for drug search results.
    Returns pharmacy details and quantity for a given inventory item.
    """
    pharmacy = PharmacyListSerializer(read_only=True)
    drug_name = serializers.CharField(source='drug.name', read_only=True)
    drug_price = serializers.DecimalField(source='drug.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Inventory
        fields = ('drug_name', 'drug_price', 'quantity', 'pharmacy')
