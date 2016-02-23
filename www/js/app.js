// Ionic Movement App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('movement', ['ionic', 'angular-storage', 'uiGmapgoogle-maps', 'movement.controllers', 'movement.services'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.constant('API_URL', 'http://54.152.112.50:3000')

// Configure Google Maps
.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyBiTGJkXnuwIHMbg0keDrhP--hBClpNMAA', // yolo
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,geometry,visualization,marker'
    });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
    .state('tab', {
    url: '/tab',
    abstract: true,
    templateUrl: 'templates/tabs.html'
  })

  // Each tab has its own nav history stack:

  .state('register', {
    url: '/register',
    templateUrl: 'templates/register.html',
    controller: 'RegisterCtrl'
  })
  
  .state('authenticate', {
    url: '/authenticate',
    templateUrl: 'templates/authenticate.html',
    controller: 'AuthenticateCtrl'
  })

  .state('tab.venue', {
    url: '/venues',
    views: {
      'tab-venues': {
        templateUrl: 'templates/tab-venues.html',
        controller: 'VenuesCtrl'
      }
    }
  })
  .state('tab.venue-detail', {
      url: '/venues/:venueId',
      views: {
        'tab-venues': {
          templateUrl: 'templates/venue-detail.html',
          controller: 'VenuesDetailCtrl'
        }
      }
    })

  .state('tab.activity', {
      url: '/activity',
      views: {
        'tab-activity': {
          templateUrl: 'templates/tab-activity.html',
          controller: 'ActivityCtrl'
        }
      }
    })

  .state('tab.settings', {
    url: '/settings',
    views: {
      'tab-settings': {
        templateUrl: 'templates/tab-settings.html',
        controller: 'SettingsCtrl'
      }
    }
  })
  .state('tab.logs', {
    url: '/settings/logs',
    views: {
        'tab-settings': {
          templateUrl: 'templates/logs.html',
          controller: 'LogCtrl'
        }
      }
  })
  
  .state('tab.about', {
    url: '/about',
    views: {
      'tab-about': {
        templateUrl: 'templates/tab-about.html',
        controller: 'AboutCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/venues');

});
