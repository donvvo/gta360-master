var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var moment = require('moment');

var tourSchema = mongoose.Schema({
  creator: {
    type: ObjectId,
    ref: 'User'
  },
  creatorName: String,
  manager: ObjectId,
  managerName: String,
  HQPhotography: String,
  cinematicHDVideography: String,
  matterportTour: String,
  aerialPhotoVideo: String,
  additionalServices: [String],
  twilightPhotoQuantity: Number,
  property: {
    name: {
      type: String,
      required: true
    },
    image: String,
    address: {
      street_address: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      province: {
        type: String,
        required: true
      },
      postal_code: {
        type: String,
        required: true
      },
      addressURL: {
        type: String
      }
    }
  },
  request_note: String,
  request_date: Date,
  status: {
    type: String,
    enum: ['REQUESTED', 'CONFIRMED', 'COMPLETE', 'DELIVERED'],
    default: 'REQUESTED'
  },
  tour_schedule: Date,
  slider: {
    slider_type: {
      type: String,
      enum: ['IMAGE', 'VIDEO']
    },
    image: String,
    video: String
  },
  panoramicImages: [{
    photo: String,
    priority: {
      type: Number,
      default: 0
    }
  }],
  panoramicImagesQuantity: Number,
  agent: {
    name: String,
    profile_picture: String,
    title: String,
    brokerage: String,
    address: String,
    telephone: String,
    email: String,
    website: String
  },
  highlights: {
    square_feet: {
      display: Boolean,
      detail: String
    },
    bath: {
      display: Boolean,
      detail: String
    },
    bedroom: {
      display: Boolean,
      detail: String
    },
    floors: {
      display: Boolean,
      detail: String
    },
    inlaw_suite: {
      display: Boolean,
      detail: String
    },
    car_parking: {
      display: Boolean,
      detail: String
    },
    locker: {
      display: Boolean,
      detail: String
    },
    parking: {
      display: Boolean,
      detail: String
    },
    kitchens: {
      display: Boolean,
      detail: String
    },
    pool: {
      display: Boolean,
      detail: String
    },
    basement_apt: {
      display: Boolean,
      detail: String
    },
    lot_size: {
      display: Boolean,
      detail: String
    },
    irregular_lot: {
      display: Boolean,
      detail: String
    },
    ttc: {
      display: Boolean,
      detail: String
    },
    highway: {
      display: Boolean,
      detail: String
    },
    parks: {
      display: Boolean,
      detail: String
    },
    schools: {
      display: Boolean,
      detail: String
    },
    year_build: {
      display: Boolean,
      detail: String
    },
    new_build: {
      display: Boolean,
      detail: String
    },
    custom_build: {
      display: Boolean,
      detail: String
    },
    ravine_lot: {
      display: Boolean,
      detail: String
    },
  },
  features: {
    description: String,
    highlight1: String,
    highlight2: String,
    highlight3: String,
    highlight4: String,
    highlight5: String,
    highlight6: String,
    highlight7: String,
    highlight8: String,
    highlight9: String,
    highlight10: String,
    highlight11: String,
    highlight12: String
  },
  neighborhood: {
    lat: String,
    lng: String,
    description: String,
    highlight1: String,
    highlight2: String,
    highlight3: String,
    highlight4: String
  },
  gallery: [{
    photo: {
      type: String,
      required: true
    },
    name: String,
    priority: {
      type: Number,
      default: 0
    }
  }],
  open_house_date1: {
    type: Date,
    get: prettyFormatDateTime
  },
  open_house_date1_end: String,
  open_house_date2: {
    type: Date,
    get: prettyFormatDateTime
  },
  open_house_date2_end: String,
  open_house_date3: {
    type: Date,
    get: prettyFormatDateTime
  },
  open_house_date3_end: String,
  open_house_date4: {
    type: Date,
    get: prettyFormatDateTime
  },
  open_house_date4_end: String,
  open_house_alternate_text: String,
  offer_date: {
    type: Date,
    get: prettyFormatDateTime
  },
  offer_date_alternate_text: String,
  offer_price: String,
  theme: {
    type: String,
    enum: ['WHITE', 'DARK'],
    default: 'WHITE'
  },
  map: String,
  video_link: String,
  floor_plans: String,
  feature_sheet: String,
  display: {
    subslider: Boolean,
    panoramicImages: Boolean,
    open_house: Boolean,
    offer_presentation: Boolean,
    property_details: Boolean,
    neighborhood: Boolean,
    agent_info: Boolean
  },
  mediaPackage: String,
  discount: Number,
  virtualTourCode: String,
  panoTour: {
    url: {
      type: String,
      default: ""
    },
    thumbnail: {
      type: String,
      default: ""
    },
    code: {
      type: String,
      default: ""
    }
  }
});

tourSchema.virtual('pretty_schedule').get(function() {
  if (this.tour_schedule) {
    return moment(this.tour_schedule).format('YYYY/MM/DD HH:mm');
  }
  else {
    return ""
  }
});

tourSchema.virtual('pretty_request_date').get(function() {
  return moment(this.request_date).format('YYYY/MM/DD HH:mm');
});

tourSchema.virtual('pretty_open_house_date1').get(function() {
  return `${moment(this.open_house_date1).format('dddd, MMMM Do YYYY, h:mm a')} 
  - ${moment(this.open_house_date1_end, 'HH:mm').format('h:mm a')}`
});

tourSchema.virtual('pretty_open_house_date2').get(function() {
  return `${moment(this.open_house_date2).format('dddd, MMMM Do YYYY, h:mm a')} 
  - ${moment(this.open_house_date2_end, 'HH:mm').format('h:mm a')}`
});

tourSchema.virtual('pretty_open_house_date3').get(function() {
  return `${moment(this.open_house_date3).format('dddd, MMMM Do YYYY, h:mm a')} 
  - ${moment(this.open_house_date3_end, 'HH:mm').format('h:mm a')}`
});

tourSchema.virtual('pretty_open_house_date4').get(function() {
  return `${moment(this.open_house_date4).format('dddd, MMMM Do YYYY, h:mm a')} 
  - ${moment(this.open_house_date4_end, 'HH:mm').format('h:mm a')}`
});

tourSchema.virtual('pretty_offer_date').get(function() {
  return moment(this.offer_date).format('dddd, MMMM Do YYYY, h:mm a');
});

tourSchema.virtual('property.full_address').get(function() {
  return `${this.property.address.street_address}, ${this.property.address.city}, ` +
    `${this.property.address.province} ${this.property.address.postal_code}`
});

tourSchema.virtual('statusColorCode').get(function() {
  switch (this.status) {
    case 'REQUESTED':
      return '#d9534f'
    case 'CONFIRMED':
      return '#FAB702'
    case 'COMPLETE':
      return '#5cb85c'
    default:
      return ''
  }
})

tourSchema.virtual('status_display').get(function() {
  var status = this.status
  if (status === 'CONFIRMED') {
    status = 'SCHEDULED'
  }

  return status
})

tourSchema.virtual('validGeocode').get(function() {
  return (this.neighborhood.lat) && (this.neighborhood.lng)
})

tourSchema.virtual('panoramicImagesJSON').get(function() {
  return JSON.stringify(this.panoramicImages)
})

tourSchema.virtual('panoramicImagesMorethanOne').get(function() {
  return this.panoramicImages.length > 1
})

tourSchema.virtual('uid').get(function() {
  return this._id.toString().slice(18)
})

tourSchema.virtual('url').get(function() {
  if (this.status === 'DELIVERED') {
    return `/${this.property.address.addressURL}`
  }
  else {
    return `/tour/${this._id}`
  }
})

tourSchema.virtual('isDelivered').get(function() {
  return this.status === 'DELIVERED'
})

tourSchema.methods.convertAddressToAddressURL = function() {
  this.property.address.addressURL =
    encodeURI(this.property.address.street_address
      .replace(/\s/g, '').replace(/\./g, '').toLowerCase())
}

function prettyFormatDateTime(val, schematype) {
  if (!(val && val instanceof Date)) return val
  return moment(val).format('YYYY/MM/DD HH:mm');
}

var Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
