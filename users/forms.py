# users/forms.py (Optional, if you need custom fields beyond username/password)
from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm, AuthenticationForm
from django.contrib.auth import get_user_model

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(max_length=30, required=False)
    last_name = forms.CharField(max_length=30, required=False)

    class Meta(UserCreationForm.Meta):
        model = get_user_model()
        fields = UserCreationForm.Meta.fields + ('email', 'first_name', 'last_name',)

# You might still need a custom AuthenticationForm if you want to modify its fields or validation
# For now, we'll stick with Django's default AuthenticationForm in the view.