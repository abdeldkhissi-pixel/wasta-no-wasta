export type AccountType = 'particulier' | 'prestataire';
export type MoroccanCity = string;

export type ServiceCategory = 
  | 'Maison & Réparation'
  | 'Digital & Créatif'
  | 'Cours & Formation'
  | 'Événementiel'
  | 'Transport & Livraison'
  | 'Ménage'
  | 'Informatique'
  | 'Autres services';

export interface UserDoc {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  city: MoroccanCity;
  accountType: AccountType;
  profileImage?: string;
  accountStatus: 'active' | 'suspended';
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface ProviderProfileDoc {
  userId: string;
  fullName: string;
  professionalTitle: string;
  description: string;
  categories: ServiceCategory[];
  skills: string[];
  experience: string;
  city: MoroccanCity;
  serviceArea: string;
  availability: string;
  profileCompleted: boolean;
  isPublished: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  profileImage?: string;
  serviceId?: string;
  likesCount?: number;
  likedBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDoc {
  serviceId: string;
  providerId: string;
  providerName: string;
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  pricingType: 'Fixe' | 'Par heure' | 'Négociable';
  city: MoroccanCity;
  images: string[];
  status: 'active' | 'unpublished' | 'flagged';
  likesCount?: number;
  likedBy?: string[];
  createdAt: string;
}

export interface ServiceRequestDoc {
  requestId: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  title: string;
  description: string;
  category: ServiceCategory;
  city: MoroccanCity;
  neighborhood?: string;
  budget: number;
  preferredDate: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  proposalsCount: number;
  likesCount?: number;
  likedBy?: string[];
  createdAt: string;
}

export interface ProposalDoc {
  proposalId: string;
  requestId: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  clientId: string;
  proposedPrice: number;
  message: string;
  eta: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
}

export interface ConversationDoc {
  conversationId: string;
  participants: string[];
  participantNames?: Record<string, string>;
  lastMessage: string;
  lastSenderId?: string;
  lastMessageId?: string;
  unreadCounts?: Record<string, number>;
  updatedAt: string;
}

export interface MessageDoc {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  createdAtIso?: string;
  readStatus: boolean;
  isEdited?: boolean;
  editedAt?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  mediaUrl?: string;
  fileName?: string;
}

export interface CommentDoc {
  commentId: string;
  parentId: string; // serviceId, requestId, or providerId
  parentType: 'service' | 'request' | 'provider';
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export interface ReviewDoc {
  reviewId: string;
  clientId: string;
  clientName: string;
  providerId: string;
  serviceId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
