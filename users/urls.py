# users/urls.py

from django.urls import path
from . import views
from django.contrib.auth import views as auth_views # Django's built-in auth views

urlpatterns = [
    # Publicly accessible pages
    path('', views.index_page, name='index_page'), # Your main/index page
    path('developerTeam/', views.developer_team_view, name='developer_team_page'),
    path('auth/', views.auth_view, name='auth_page'),
    # New URL for email verification
    path('verify-email/<str:uidb64>/<str:token>/', views.verify_email, name='verify_email'),
    path('modelPage/', views.model_page_view, name='model_page'),
    path('article/', views.article_view, name='article_page'),
     path('', views.index_page, name='index_page'), # <--- Add this line for your root URL
    # User-related actions (requires no specific template, handled by built-in views)
    path('logout/', views.logout_view, name='logout'), # Use your custom logout view
    #path('download-users-pdf/', views.download_users_pdf, name='download_users_pdf'),
    
]