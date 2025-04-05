from datetime import date
from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, PasswordField, BooleanField, SubmitField, TextAreaField, SelectField
from wtforms import IntegerField, FloatField, DateField
from wtforms.validators import DataRequired, Email, EqualTo, Length, Optional, NumberRange, ValidationError

from models import User


class LoginForm(FlaskForm):
    """Login form."""
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Sign In')


class RegistrationForm(FlaskForm):
    """User registration form."""
    username = StringField('Username', validators=[DataRequired(), Length(min=4, max=64)])
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    first_name = StringField('First Name', validators=[Optional(), Length(max=64)])
    last_name = StringField('Last Name', validators=[Optional(), Length(max=64)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    role = SelectField('Role', coerce=int, validators=[DataRequired()])
    submit = SubmitField('Register')
    
    def validate_username(self, username):
        """Check username is unique"""
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already taken. Please choose a different one.')
    
    def validate_email(self, email):
        """Check email is unique"""
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered. Please use a different one.')


class ChangePasswordForm(FlaskForm):
    """Password change form."""
    current_password = PasswordField('Current Password', validators=[DataRequired()])
    new_password = PasswordField('New Password', validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField('Confirm New Password', validators=[DataRequired(), EqualTo('new_password')])
    submit = SubmitField('Change Password')


class StoreForm(FlaskForm):
    """Form for adding or editing stores."""
    name = StringField('Store Name', validators=[DataRequired(), Length(max=100)])
    code = StringField('Store Code', validators=[DataRequired(), Length(max=20)])
    location = StringField('Location', validators=[Optional(), Length(max=255)])
    address = TextAreaField('Address', validators=[Optional()])
    phone = StringField('Phone', validators=[Optional(), Length(max=20)])
    email = StringField('Email', validators=[Optional(), Email(), Length(max=120)])
    submit = SubmitField('Save Store')


class ProductForm(FlaskForm):
    """Form for adding or editing products."""
    name = StringField('Product Name', validators=[DataRequired(), Length(max=100)])
    sku = StringField('SKU', validators=[Optional(), Length(max=50)])
    barcode = StringField('Barcode', validators=[Optional(), Length(max=50)])
    description = TextAreaField('Description', validators=[Optional()])
    category = StringField('Category', validators=[Optional(), Length(max=50)])
    unit_price = FloatField('Selling Price', validators=[DataRequired(), NumberRange(min=0)])
    cost_price = FloatField('Cost Price', validators=[Optional(), NumberRange(min=0)])
    reorder_level = IntegerField('Reorder Level', validators=[DataRequired(), NumberRange(min=0)], default=10)
    location_in_store = StringField('Location in Store', validators=[Optional(), Length(max=100)])
    image = FileField('Product Image', validators=[Optional(), FileAllowed(['jpg', 'png'], 'Images only!')])
    store_id = SelectField('Store', coerce=int, validators=[DataRequired()])
    submit = SubmitField('Save Product')


class StockInForm(FlaskForm):
    """Form for adding new inventory."""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    unit_price = FloatField('Unit Price', validators=[DataRequired(), NumberRange(min=0)])
    reference = StringField('Reference (Invoice/PO)', validators=[Optional(), Length(max=50)])
    notes = TextAreaField('Notes', validators=[Optional()])
    movement_date = DateField('Date', validators=[Optional()], default=date.today)
    submit = SubmitField('Record Stock In')


class SaleForm(FlaskForm):
    """Form for recording sales."""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    unit_price = FloatField('Unit Price', validators=[DataRequired(), NumberRange(min=0)])
    reference = StringField('Reference (Receipt #)', validators=[Optional(), Length(max=50)])
    notes = TextAreaField('Notes', validators=[Optional()])
    movement_date = DateField('Date', validators=[Optional()], default=date.today)
    submit = SubmitField('Record Sale')


class RemovalForm(FlaskForm):
    """Form for recording manual removals."""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    reason = SelectField('Reason', choices=[
        ('damaged', 'Damaged'),
        ('expired', 'Expired'),
        ('stolen', 'Stolen/Lost'),
        ('other', 'Other')
    ], validators=[DataRequired()])
    notes = TextAreaField('Notes', validators=[Optional()])
    movement_date = DateField('Date', validators=[Optional()], default=date.today)
    submit = SubmitField('Record Removal')


class SupplierForm(FlaskForm):
    """Form for adding or editing suppliers."""
    name = StringField('Supplier Name', validators=[DataRequired(), Length(max=100)])
    contact_name = StringField('Contact Person', validators=[Optional(), Length(max=100)])
    email = StringField('Email', validators=[Optional(), Email(), Length(max=120)])
    phone = StringField('Phone', validators=[Optional(), Length(max=20)])
    address = TextAreaField('Address', validators=[Optional()])
    submit = SubmitField('Save Supplier')


class SupplierProductForm(FlaskForm):
    """Form for linking suppliers to products."""
    supplier_id = SelectField('Supplier', coerce=int, validators=[DataRequired()])
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    supplier_sku = StringField('Supplier SKU', validators=[Optional(), Length(max=50)])
    cost_price = FloatField('Cost Price', validators=[Optional(), NumberRange(min=0)])
    lead_time_days = IntegerField('Lead Time (Days)', validators=[Optional(), NumberRange(min=0)])
    minimum_order_quantity = IntegerField('Minimum Order Quantity', validators=[Optional(), NumberRange(min=1)], default=1)
    is_preferred = BooleanField('Preferred Supplier')
    notes = TextAreaField('Notes', validators=[Optional()])
    submit = SubmitField('Save Supplier Product')


class PurchaseOrderForm(FlaskForm):
    """Form for creating purchase orders."""
    supplier_id = SelectField('Supplier', coerce=int, validators=[DataRequired()])
    order_number = StringField('Order Number', validators=[Optional(), Length(max=50)])
    expected_delivery_date = DateField('Expected Delivery Date', validators=[Optional()])
    notes = TextAreaField('Notes', validators=[Optional()])
    submit = SubmitField('Create Purchase Order')


class PurchaseOrderItemForm(FlaskForm):
    """Form for adding items to purchase orders."""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity_ordered = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    unit_price = FloatField('Unit Price', validators=[DataRequired(), NumberRange(min=0)])
    submit = SubmitField('Add Item')


class SalesOrderForm(FlaskForm):
    """Form for creating sales orders."""
    customer_name = StringField('Customer Name', validators=[Optional(), Length(max=100)])
    customer_phone = StringField('Customer Phone', validators=[Optional(), Length(max=20)])
    order_number = StringField('Order Number', validators=[Optional(), Length(max=50)])
    payment_method = SelectField('Payment Method', choices=[
        ('cash', 'Cash'),
        ('credit_card', 'Credit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('other', 'Other')
    ], validators=[Optional()])
    payment_status = SelectField('Payment Status', choices=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('partial', 'Partial'),
        ('refunded', 'Refunded')
    ], default='pending', validators=[DataRequired()])
    notes = TextAreaField('Notes', validators=[Optional()])
    submit = SubmitField('Create Sales Order')


class SalesOrderItemForm(FlaskForm):
    """Form for adding items to sales orders."""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    unit_price = FloatField('Unit Price', validators=[DataRequired(), NumberRange(min=0)])
    discount = FloatField('Discount %', validators=[Optional(), NumberRange(min=0, max=100)], default=0)
    submit = SubmitField('Add Item')


class InventoryTransferForm(FlaskForm):
    """Form for creating inventory transfers between stores."""
    source_store_id = SelectField('Source Store', coerce=int, validators=[DataRequired()])
    destination_store_id = SelectField('Destination Store', coerce=int, validators=[DataRequired()])
    transfer_number = StringField('Transfer Number', validators=[Optional(), Length(max=50)])
    notes = TextAreaField('Notes', validators=[Optional()])
    submit = SubmitField('Create Transfer')
    
    def validate_destination_store_id(self, destination_store_id):
        """Ensure source and destination stores are different"""
        if self.source_store_id.data == destination_store_id.data:
            raise ValidationError('Source and destination stores must be different.')


class InventoryTransferItemForm(FlaskForm):
    """Form for adding items to inventory transfers."""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    notes = TextAreaField('Notes', validators=[Optional()])
    submit = SubmitField('Add Item')


class ReportFilterForm(FlaskForm):
    """Form for filtering inventory reports."""
    store_id = SelectField('Store', coerce=int, validators=[Optional()])
    product_id = SelectField('Product', coerce=int, validators=[Optional()])
    movement_type = SelectField('Movement Type', choices=[
        ('', 'All'),
        ('stock_in', 'Stock In'),
        ('sale', 'Sales'),
        ('removal', 'Removals'),
        ('transfer_in', 'Transfer In'),
        ('transfer_out', 'Transfer Out')
    ], validators=[Optional()])
    start_date = DateField('Start Date', validators=[Optional()])
    end_date = DateField('End Date', validators=[Optional()])
    submit = SubmitField('Generate Report')


class ProductReportForm(FlaskForm):
    """Form for filtering product reports."""
    store_id = SelectField('Store', coerce=int, validators=[Optional()])
    category = StringField('Category', validators=[Optional()])
    show_zero_stock = BooleanField('Include Zero Stock Products')
    submit = SubmitField('Generate Report')


class SupplierReportForm(FlaskForm):
    """Form for filtering supplier reports."""
    supplier_id = SelectField('Supplier', coerce=int, validators=[Optional()])
    start_date = DateField('Start Date', validators=[Optional()])
    end_date = DateField('End Date', validators=[Optional()])
    submit = SubmitField('Generate Report')