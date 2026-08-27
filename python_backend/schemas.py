"""Pydantic schemas for request/response validation across all endpoints."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ====== AUTH ======
class SignupRequest(BaseModel):
    email: str
    password: str
    fullName: str
    phone: Optional[str] = None
    city: Optional[str] = None
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    user: dict
    token: str


class ProfileUpdateRequest(BaseModel):
    fullName: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None


class EmailVerifyRequest(BaseModel):
    email: str
    verificationData: dict


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    email: str
    newPassword: str


# ====== USERS ======
class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    city: Optional[str] = None
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    verified: int = 0
    rating: float = 0.0
    review_count: int = 0
    created_at: Optional[datetime] = None


# ====== GIGS ======
class GigCreateRequest(BaseModel):
    title: str
    description: str
    price: float
    category: str
    deliveryTime: int


class GigUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    deliveryTime: Optional[int] = None
    active: Optional[int] = None


# ====== JOBS ======
class JobCreateRequest(BaseModel):
    title: str
    description: str
    budgetMin: float
    budgetMax: float
    category: str
    deadline: Optional[str] = None


class BidRequest(BaseModel):
    amount: float
    proposal: Optional[str] = None


class AwardRequest(BaseModel):
    freelancerId: str


class QuickOrderRequest(BaseModel):
    amount: float
    proposal: Optional[str] = None


class DeliverRequest(BaseModel):
    message: Optional[str] = None
    files: Optional[list] = None


class JobStatusUpdate(BaseModel):
    status: str


# ====== MESSAGES ======
class MessageSendRequest(BaseModel):
    receiverId: str
    message: Optional[str] = None
    jobId: Optional[str] = None
    attachmentUrl: Optional[str] = None
    attachmentName: Optional[str] = None
    attachmentSize: Optional[int] = None
    attachmentType: Optional[str] = None


# ====== ORDERS ======
class OrderCreateRequest(BaseModel):
    gig_id: str
    requirements: Optional[str] = None


class OrderDeliverRequest(BaseModel):
    message: Optional[str] = None
    files: Optional[list] = None


# ====== PAYMENTS ======
class ReceiptVerifyRequest(BaseModel):
    itemType: str
    itemId: str
    amount: float
    receiptPhoto: str
    receiptReference: str


class BiometricConfirmRequest(BaseModel):
    transactionId: str
    selfieData: str
    audioData: Optional[str] = None
    mimeType: Optional[str] = None


class ChapaInitiateRequest(BaseModel):
    amount: float
    currency: Optional[str] = "ETB"
    email: str
    first_name: Optional[str] = "Customer"
    last_name: Optional[str] = "User"
    description: Optional[str] = None
    gig_id: Optional[str] = None
    requirements: Optional[str] = None
    itemTitle: Optional[str] = None
    is_send_money: Optional[bool] = False
    recipient_id: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_bank: Optional[str] = None
    recipient_account: Optional[str] = None
    recipient_city: Optional[str] = None
    recipient_region: Optional[str] = None
    recipient_relationship: Optional[str] = None
    recipient_purpose: Optional[str] = None
    recipient_reference: Optional[str] = None
    recipient_expected_date: Optional[str] = None
    recipient_notes: Optional[str] = None


class ChapaVerifyRequest(BaseModel):
    tx_ref: str


class PaymentInitiateRequest(BaseModel):
    jobId: str


class PaymentConfirmRequest(BaseModel):
    transactionId: str
    telebirrRef: Optional[str] = None


class PaymentReleaseRequest(BaseModel):
    jobId: str


class PaymentDisputeRequest(BaseModel):
    jobId: str
    reason: str


# ====== REVIEWS ======
class ReviewCreateRequest(BaseModel):
    jobId: str
    revieweeId: str
    rating: int
    comment: Optional[str] = None
    role: str


# ====== FEATURES ======
class DisputeCreateRequest(BaseModel):
    transactionId: str
    reason: str
    description: Optional[str] = None
    evidence: Optional[list] = None


class DisputeEvidenceRequest(BaseModel):
    evidence: list


class DisputeStatusRequest(BaseModel):
    status: str
    adminNotes: Optional[str] = None


class PortfolioAddRequest(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    tags: Optional[str] = None
    category: Optional[str] = None


class ReferralRedeemRequest(BaseModel):
    code: str


# ====== AI ======
class AIImageGenerateRequest(BaseModel):
    prompt: str
    image: Optional[str] = None  # base64 image for img2img


class AIChatRequest(BaseModel):
    message: str
    agentId: Optional[str] = None
    conversationId: Optional[str] = None


class AIGigRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: str


class AIStoreGenerateRequest(BaseModel):
    storeName: str
    description: str
    category: Optional[str] = None
    products: Optional[str] = None
    portfolioItems: Optional[str] = None
    style: Optional[str] = "modern, warm, trustworthy"
    brandVoice: Optional[str] = "confident, human, premium"
    brandColors: Optional[str] = None
    fontFamily: Optional[str] = "manrope"
    headingFont: Optional[str] = "playfair"
    typeScale: Optional[str] = "editorial"
    letterSpacing: Optional[str] = "tight"
    contactEmail: Optional[str] = None
    socialLinks: Optional[str] = None
    siteType: str = "portfolio"
    currency: str = "ETB"


class SmartMatchRequest(BaseModel):
    projectDescription: str
    budget: Optional[float] = None
    category: Optional[str] = None


# ====== CATEGORIES ======
class CategoryCreateRequest(BaseModel):
    name: str
    icon: Optional[str] = "📋"
    description: Optional[str] = ""
    sortOrder: Optional[int] = 0


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    sortOrder: Optional[int] = None
    active: Optional[int] = None


# ====== BUSINESS ======
class CustomerCreateRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "active"


class CustomerUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class MeetingCreateRequest(BaseModel):
    customerId: Optional[str] = None
    title: str
    description: Optional[str] = None
    date: str
    duration: Optional[int] = 30
    meetingType: Optional[str] = "video"


class MeetingUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    duration: Optional[int] = None
    status: Optional[str] = None
    meetingType: Optional[str] = None


class InvoiceCreateRequest(BaseModel):
    customerId: Optional[str] = None
    invoiceNumber: str
    amount: float
    dueDate: Optional[str] = None
    lineItems: Optional[str] = None
    notes: Optional[str] = None


class InvoiceUpdateRequest(BaseModel):
    status: Optional[str] = None
    paidDate: Optional[str] = None
    notes: Optional[str] = None


class TeamMemberCreateRequest(BaseModel):
    memberName: str
    memberEmail: Optional[str] = None
    role: Optional[str] = "member"


class TeamMemberUpdateRequest(BaseModel):
    memberName: Optional[str] = None
    memberEmail: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


# ====== AGENTS ======
class AgentCreateRequest(BaseModel):
    name: str
    role: Optional[str] = "assistant"
    instructions: Optional[str] = ""
    model: Optional[str] = "default"
    avatar: Optional[str] = None
    color: Optional[str] = "#16a34a"
    parentAgentId: Optional[str] = None


class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    instructions: Optional[str] = None
    model: Optional[str] = None
    avatar: Optional[str] = None
    color: Optional[str] = None
    isActive: Optional[int] = None


class ConversationCreateRequest(BaseModel):
    title: Optional[str] = "New Conversation"


class AgentMessageSendRequest(BaseModel):
    content: str
    metadata: Optional[dict] = None
    files: Optional[list[dict]] = None


# ====== WALLET ======
class PinAttemptRequest(BaseModel):
    type: str = "attempt"  # 'attempt' or 'success'
