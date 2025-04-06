# Kiryana Inventory System
# Developed by Hira Fatima
# Form definitions for the inventory system

from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, FloatField, IntegerField, SelectField, SubmitField, DateField
from wtforms.validators import DataRequired, Optional, NumberRange

class ProductForm(FlaskForm):
    """Form for adding or editing products"""
    name = StringField('Product Name', validators=[DataRequired()])
    sku = StringField('SKU', validators=[DataRequired()])
    description = TextAreaField('Description', validators=[Optional()])
    unit_price = FloatField('Unit Price', validators=[DataRequired(), NumberRange(min=0)])
    reorder_level = IntegerField('Reorder Level', validators=[DataRequired(), NumberRange(min=0)], default=10)
    submit = SubmitField('Save Product')

class StockInForm(FlaskForm):
    """Form for adding new inventory"""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    unit_price = FloatField('Unit Price', validators=[DataRequired(), NumberRange(min=0)])
    reference = StringField('Reference (Invoice/PO)', validators=[Optional()])
    notes = TextAreaField('Notes', validators=[Optional()])
    movement_date = DateField('Date', validators=[Optional()])
    submit = SubmitField('Record Stock In')

class SaleForm(FlaskForm):
    """Form for recording sales"""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    unit_price = FloatField('Unit Price', validators=[DataRequired(), NumberRange(min=0)])
    reference = StringField('Reference (Receipt #)', validators=[Optional()])
    notes = TextAreaField('Notes', validators=[Optional()])
    movement_date = DateField('Date', validators=[Optional()])
    submit = SubmitField('Record Sale')

class RemovalForm(FlaskForm):
    """Form for recording manual removals"""
    product_id = SelectField('Product', coerce=int, validators=[DataRequired()])
    quantity = IntegerField('Quantity', validators=[DataRequired(), NumberRange(min=1)])
    reason = SelectField('Reason', choices=[
        ('damaged', 'Damaged'),
        ('expired', 'Expired'),
        ('stolen', 'Stolen/Lost'),
        ('other', 'Other')
    ], validators=[DataRequired()])
    notes = TextAreaField('Notes', validators=[Optional()])
    movement_date = DateField('Date', validators=[Optional()])
    submit = SubmitField('Record Removal')

class ReportFilterForm(FlaskForm):
    """Form for filtering inventory reports"""
    product_id = SelectField('Product', coerce=int, validators=[Optional()])
    movement_type = SelectField('Movement Type', choices=[
        ('', 'All'),
        ('stock_in', 'Stock In'),
        ('sale', 'Sales'),
        ('removal', 'Removals')
    ], validators=[Optional()])
    start_date = DateField('Start Date', validators=[Optional()])
    end_date = DateField('End Date', validators=[Optional()])
    submit = SubmitField('Generate Report')
