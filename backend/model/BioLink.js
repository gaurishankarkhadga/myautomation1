const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.*/.test(v);
      },
      message: 'URL must start with http:// or https://'
    }
  },
  platform: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  clickCount: {
    type: Number,
    default: 0
  }
});

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  price: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.*/.test(v);
      },
      message: 'URL must start with http:// or https://'
    }
  },
  category: {
    type: String,
    trim: true
  }
});

const ticketSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  event_date: {
    type: Date,
    required: true
  },
  event_time: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  venue: {
    type: String,
    trim: true
  },
  total_tickets: {
    type: Number,
    required: true,
    min: 1
  },
  available_tickets: {
    type: Number,
    required: true,
    min: 0
  },
  cover_image: {
    type: String,
    trim: true
  },
  event_type: {
    type: String,
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
});

const biolinkSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: false,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_-]+$/
  },
  profile: {
    avatar: {
      type: String,
      trim: true
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 200
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  links: [linkSchema],
  products: [productSchema],
  tickets: [ticketSchema],
  theme: {
    type: String,
    default: 'minimal'
  },
  elements: [{
    id: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['text', 'image', 'video', 'button', 'social', 'gallery', 'form', 'separator', 'cta', 'ticket']
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    position: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  settings: {
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    textColor: {
      type: String,
      default: '#1e1b4b'
    },
    accentColor: {
      type: String,
      default: '#8b5cf6'
    },
    borderRadius: {
      type: String,
      default: '12px'
    },
    spacing: {
      type: String,
      default: '16px'
    }
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    lastViewed: Date
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes (username is already unique from schema)
biolinkSchema.index({ userId: 1, lastModified: -1 });
biolinkSchema.index({ isPublished: 1 });
biolinkSchema.index({ 'analytics.views': -1 });

module.exports = mongoose.model('BioLink', biolinkSchema);
