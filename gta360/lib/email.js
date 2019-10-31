/**
 * Created by andrewjjung on 2016-09-07.
 */

var fs = require('fs')

var credentials = require('../credentials')
var mailgun = require('mailgun-js')(credentials.mailgun)
var mailcomposer = require('mailcomposer')


function generateSubject(subject) {
  var subjectHeader = '[Property Vision]'

  return `${subjectHeader} ${subject}`
}

var domain = 'propertyvision.ca'
var siteUrl = `http://${domain}`

function readEmailBase(cb) {
  const templatePath = __dirname + '/../views/email_templates/email_base.html'

  fs.readFile(templatePath, 'utf8', function(err, html) {
    if (err) return cb(err, null)

    return cb(null, html)
  })
}

function readEmailTemplate(templateName, cb) {
  readEmailBase(function(err, baseHtml) {
    if (err) return cb(err, null)

    const templateDirectory = __dirname + '/../views/email_templates/'

    fs.readFile(templateDirectory + templateName, 'utf8', function(err, html) {
      if (err) return cb(err, null)

      var emailHtml = baseHtml.replace('$CONTENT', html)

      return cb(null, emailHtml)
    })
  })
}

module.exports = {
  sendEmail: function(to, subject, body, html, cb) {
    var mail = mailcomposer({
      from: `info@${domain}`,
      to: to,
      subject: subject,
      html: html
    })

    mail.build(function(mailBuildError, message) {
      if (mailBuildError) return cb(mailBuildError)

      var dataToSend = {
        to: to,
        message: message.toString('ascii')
      }

      mailgun.messages().sendMime(dataToSend, function(sendError, body) {
        if (sendError) return cb(sendError)

        cb(null, body)
      })
    })
  },

  homeContactForm: function(adminEmails, email, name, phone, message, cb) {
    var subject = generateSubject(`Contact form from ${name}`)
    var html = `${name} has submitted a contact form from Property Vision app. \<br /\>\<br /\>
    Name: ${name} \<br /\> Email: ${email} \<br /\> Phone: ${phone} \<br /\> Message: ${message}`

    this.sendEmail(adminEmails, subject, html, html, cb)
  },
  tourContactForm: function(requestorEmail, tourAddress, email, name, phone, message, cb) {
    var subject = generateSubject(`Message from your tour`)

    var self = this

    readEmailTemplate('email_tour_contact.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var emailHtml = emailHtml.replace(/\$NAME/g, name).replace('$TOURADDRESS', tourAddress)
        .replace('$EMAIL', email).replace('$PHONE', phone).replace('$MESSAGE', message)

      self.sendEmail(requestorEmail, subject, emailHtml, emailHtml, cb)
    })
  },
  resetPassword: function(email, resetPasswordToken, cb) {
    var subject = generateSubject('Password Reset')
    var body = `There has been a request to reset the password for this account.
    You can reset your password at ${siteUrl}/reset-password/${resetPasswordToken}.
    If you haven't requested for reset password, but receiving this email, please contact us.`
    var html = `There has been a request to reset the password for this account. \<br /\> 
    \<a href=\"${siteUrl}/reset-password/${resetPasswordToken}\"\>Click here to reset your password.\</a\> \<br /\>
    If you haven't requested for reset password, but receiving this email, please contact us.`

    this.sendEmail(email, subject, body, html, cb)
  },
  newTourRequested: function(email, requestorName, requestorEmail, cb) {
    var subject = generateSubject('New Tour Requested')
    var body = `A new tour has been requested by ${requestorName}(${requestorEmail}).`
    var html = `A new tour has been requested by ${requestorName}(${requestorEmail}).`

    this.sendEmail(email, subject, body, html, cb)
  },
  tourStatusChange: function(email, propertyName, propertyAddress, propertyStatus, cb) {
    var subject = generateSubject('Tour Status Change')
    var body = `Status for your tour - property: ${propertyName}, address: ${propertyAddress} - has been changed to
    ${propertyStatus}. Check your tours at ${siteUrl}/dashboard`
    var html = `Status for your tour - property: ${propertyName}, address: ${propertyAddress} - has been changed to 
    ${propertyStatus}. \<br /\>\<br /\>
    \<a href=\"${siteUrl}/dashboard\"\>Click here to check your tours.\</a\>`

    this.sendEmail(email, subject, body, html, cb)
  },
  deliverTour: function(email, tourUrl, propertyName, propertyAddress, cb) {
    tourUrl = `${siteUrl}/${tourUrl}`
    var subject = generateSubject('Your Tour is Complete')
    var body = `The tour you requested for ${propertyName} at ${propertyAddress} is complete. 
    These are the URLs for your tours - branded: ${tourUrl}, unbranded: ${tourUrl}/mls. 
    You can also check your tours at ${siteUrl}/dashboard`
    var html = `The tour you ordered for ${propertyName} at ${propertyAddress} is complete.
    \<br /\>\<br /\> You can access your tours from below links:\<br /\>
    branded - \<a href=\"${tourUrl}"\>${tourUrl}\</a\>\<br /\>
    unbranded - \<a href=\"${tourUrl}/mls"\>${tourUrl}/mls\</a\>\<br /\>\<br /\>
    To receive photos for your tour, please contact our office.\<br /\>\<br /\>
    You can also check all of your tours at our \<a href=\"${siteUrl}/dashboard\"\>portal.\</a\>`

    this.sendEmail(email, subject, body, html, cb)
  },
  tourOrder: function(email, tour, cb) {
    var subject = generateSubject('Thanks for Ordering a Tour.')

    var self = this

    readEmailTemplate('email_order.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var tourEditUrl = siteUrl + `/tour/${tour._id}/edit`
      var emailHtml = emailHtml.replace('$PROPERTYADDRESS', tour.property.full_address).replace('$TOUREDITURL', tourEditUrl)

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  tourOrderAdmin: function(email, client, tour, cb) {
    var subject = generateSubject('New Order from a Client')

    var self = this

    readEmailTemplate('email_order_admin.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var dashboardUrl = siteUrl + `/dashboard`
      var clientName = client.name.full
      var clientBrokerage = client.brokerage || 'N/A'
      var tourAddress = tour.property.full_address
      var tourUID = tour.uid

      var emailHtml = emailHtml.replace('$CLIENTNAME', clientName).replace('$CLIENTBROKERAGE', clientBrokerage)
        .replace('$TOURADDRESS', tourAddress).replace('$TOURUID', tourUID).replace('$DASHBOARDURL', dashboardUrl)

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  signUp: function(email, cb) {
    var subject = generateSubject('Welcome to Property Vision')

    var self = this

    readEmailTemplate('email_registration.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var emailHtml = emailHtml

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  signUpAdmin: function(email, client, cb) {
    var subject = generateSubject('New Client Registration')

    var self = this

    readEmailTemplate('email_registration_admin.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var clientName = client.name.full
      var clientBrokerage = client.brokerage || 'N/A'
      var clientPhone = client.contact.phone || 'N/A'
      var dashboardUrl = siteUrl + `/dashboard`

      var emailHtml = emailHtml.replace('$CLIENTNAME', clientName).replace('$CLIENTBROKERAGE', clientBrokerage)
        .replace('$CLIENTPHONE', clientPhone).replace('$DASHBOARDURL', dashboardUrl)

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  tourAssigned: function(email, cb) {
    var subject = generateSubject('New Tour Assigned')

    var self = this

    readEmailTemplate('email_tour_assigned.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var dashboardUrl = siteUrl + `/dashboard`

      var emailHtml = emailHtml.replace('$DASHBOARDURL', dashboardUrl)

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  tourComplete: function(email, tour, cb) {
    var subject = generateSubject('Tour Complete')

    var self = this

    readEmailTemplate('email_tour_complete.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var tourAddress = tour.property.full_address
      var tourUID =  tour.uid

      var emailHtml = emailHtml.replace('$TOURADDRESS', tourAddress).replace('$TOURUID', tourUID)

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  tourDelivered: function(email, tour, cb) {
    var subject = generateSubject('Your Tour is Complete')

    var self = this

    readEmailTemplate('email_tour_delivered.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var tourAddress = tour.property.full_address
      var brandedTourUrl = siteUrl + tour.url
      var unbrandedTourUrl = siteUrl + tour.url + '/mls'

      var emailHtml = emailHtml.replace('$PROPERTYADDRESS', tourAddress).replace(/\$UNBRANDEDTOURURL/g, unbrandedTourUrl)
        .replace(/\$BRANDEDTOURURL/g, brandedTourUrl).replace('$LOGINURL', siteUrl + '/dashboard')

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  tourScheduled: function(email, tour, cb) {
    var subject = generateSubject('Your Tour is Scheduled')

    var self = this

    readEmailTemplate('email_tour_scheduled.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var tourAddress = tour.property.full_address
      var tourSchedule = tour.pretty_schedule

      var emailHtml = emailHtml.replace('$PROPERTYADDRESS', tourAddress)
        .replace('$TOURSCHEDULE', tourSchedule)

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  tourScheduledAdmin: function(email, tour, cb) {
    var subject = generateSubject('Client Tour Scheduled')

    var self = this

    readEmailTemplate('email_tour_scheduled_admin.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var tourAddress = tour.property.full_address
      var tourUID = tour.uid
      var tourSchedule = tour.pretty_schedule
      // var photographerName = photographer.name.full

      var emailHtml = emailHtml.replace('$TOURADDRESS', tourAddress)
        .replace('$TOURUID', tourUID).replace('$TOURSCHEDULE', tourSchedule)
        //.replace('$PHOTOGRAPHERNAME', photographerName)

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
  tourScheduledPhotographer: function(email, tour, cb) {
    var subject = generateSubject('Client Tour Scheduled')

    var self = this

    readEmailTemplate('email_tour_scheduled_photographer.html', function(err, emailHtml) {
      if (err) return cb(err, null)

      var tourAddress = tour.property.full_address
      var tourUID = tour.uid
      var tourSchedule = tour.pretty_schedule

      var emailHtml = emailHtml.replace('$TOURADDRESS', tourAddress)
        .replace('$TOURUID', tourUID).replace('$TOURSCHEDULE', tourSchedule)

      self.sendEmail(email, subject, emailHtml, emailHtml, cb)
    })
  },
}


