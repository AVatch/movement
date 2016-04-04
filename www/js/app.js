// Ionic Movement App
angular.module('movement', ['ionic', 
                            'angular-storage',
                            'ngCordova', 
                            'uiGmapgoogle-maps', 
                            'movement.controllers', 
                            'movement.services'])

.run(function($rootScope, $ionicPlatform, $urlRouter, $state, Accounts, Notifications) {
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
  
   // check if the user is authenticated
  $rootScope.$on('$locationChangeSuccess', function(evt) {
     // Halt state change from even starting
     evt.preventDefault();
     // Verify the user has a session token
     if( Accounts.isAuthenticated() ){
        $urlRouter.sync();
     }else{
        $state.go('authenticate');
     }
   });
})

.constant('API_URL', 'http://52.23.168.18/api/v1')

// Configure Google Maps
.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyBiTGJkXnuwIHMbg0keDrhP--hBClpNMAA', // yolo
        v: '3.22', //defaults to latest 3.X anyhow
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
