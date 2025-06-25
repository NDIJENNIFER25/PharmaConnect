from django.contrib import admin
from .models import CustomUser, Pharmacy, Drug, Inventory, Order, OrderItem


class PharmacyAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'phone_number', 'latitude', 'longitude')
    search_fields = ('name', 'address')

class InventoryAdmin(admin.ModelAdmin):
    list_display = ('pharmacy', 'drug', 'quantity')
    list_filter = ('pharmacy',)
    search_fields = ('drug__name',)

admin.site.register(CustomUser)
admin.site.register(Pharmacy, PharmacyAdmin)
admin.site.register(Drug)
admin.site.register(Inventory, InventoryAdmin)
admin.site.register(Order)
admin.site.register(OrderItem)


# Register your models here.
