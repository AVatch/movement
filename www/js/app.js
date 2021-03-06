// Ionic Movement App
angular.module('movement', ['ionic','ionic.service.core',
                            'ionic.service.analytics',
                            'uiGmapgoogle-maps',
                            'angular-storage',
                            'ngCordova',  
                            'movement.controllers', 
                            'movement.services'])

.run(function($rootScope, $ionicPlatform, $ionicAnalytics, $timeout,  Accounts) {
  
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    
    
    try {
        var push = new Ionic.Push({
        "debug": false
        });

        push.register(function(token) {
            console.log("Device token:",token.token);
            Accounts.setDeviceToken( token.token );
            push.saveToken(token);  // persist the token in the Ionic Platform
        });
    }
    catch(err) {
        console.log(JSON.stringify(err));
    }

  });
  
})

.constant('API_URL', 'http://52.23.168.18/api/v1')
// .constant('API_URL', 'http://127.0.0.1:8000/api/v1')

.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyBa7UgG0KAlZShxva2Dyhg1Hhu7lh0BLSc',
        libraries: 'geometry,visualization'
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
    
    .state('join', {
        url: '/join',
        templateUrl: 'templates/join.html',
        controller: 'JoinCtrl'
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

})

.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});;
