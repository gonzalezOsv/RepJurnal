from flask import Blueprint, render_template, abort
from models import db, LegalDocument

legal_bp = Blueprint('legal', __name__)

@legal_bp.route('/<doc_type>')
def legal_document(doc_type):
    # Fetch the active legal document using SQLAlchemy
    document = LegalDocument.query.filter_by(document_type=doc_type, active=True).order_by(LegalDocument.effective_date.desc()).first()

    if not document:
        abort(404, description=f"No active {doc_type} document found.")

    # Render the document in the template
    return render_template(
        'legal.html',
        document_type=document.document_type,
        version=document.version,
        content=document.content,
        effective_date=document.effective_date
    )
