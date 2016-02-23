angular.module('movement.services', [])

.factory('MovementStore', function(store) {
  return store.getNamespacedStore('movement');
})

.factory('Utility', function($ionicPopup, MovementStore){
    function makeid(){
        var text = "";
        var MAX_SIZE = 500;
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < MAX_SIZE; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }
    
    return {
        getDeviceId: function(){
            // for now return random number
            // return Math.floor(Math.random()*500);
            // Cant believe i need to be doing this..
            return makeid()
        },
        raiseAlert: function(msg){
            var alertPopup = $ionicPopup.alert({
                title: 'Something went wrong!',
                template: msg
            });            
        },
        validateEmail: function(email){
            // REF: http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);
        },
        logEvent: function(msg){
            var logs = MovementStore.get('logs');
            if(!logs){
                console.log("logs not found creating them");
                MovementStore.set('logs', []);
                logs = [];
            }
            logs.push(msg);
            MovementStore.set('logs', logs);
        },
        retrieveLogEvents: function(){
            var logs = MovementStore.get('logs');
            if(!logs){
                console.log("logs not found creating them");
                MovementStore.set('logs', []);
                logs = [];
            };
            return logs;
        }
    }
})

.factory('Accounts', function($q, $http, API_URL, Utility, MovementStore){
    
    
    return {
        register: function(user){
            var deferred = $q.defer();
            
            // do some basic validation, could defer to form validation if necessary
            if(user.firstName === '' && user.lastName === '' && user.email === ''){
                Utility.raiseAlert("Please enter all the information.")
                deferred.reject();    
            }else if( !Utility.validateEmail(user.email) ){
                Utility.raiseAlert("Please enter a valid email.")
                deferred.reject();
            }
            
            // turn the user obj to the format the server expects
            var newUser = {
                fullname: user.firstName + ' ' + user.lastName,
                emailId: user.email,
                deviceId: Utility.getDeviceId()
            };
            
            
            console.log(newUser);
            // passed validation, go ahead and register
            $http({
                url: API_URL + '/users/register/',
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                data: newUser 
            }).then(function(r){
                
                console.log(r);
                
                if(r.data.status === 'failed'){
                    Utility.raiseAlert("Sorry there was an error creating your account.")
                    deferred.reject();
                }else{
                    MovementStore.set('userObj', r.data);
                }
                
            }, function(e){
                console.log("There was an error");
                console.log(e);
            })
            
            return deferred.promise;
        }
    };

})



.factory('Venues', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'img/ben.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'img/max.png'
  }, {
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'img/adam.jpg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'img/perry.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'img/mike.png'
  }];

  return {
    all: function() {
      return chats;
    },
    remove: function(chat) {
      chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < chats.length; i++) {
        if (chats[i].id === parseInt(chatId)) {
          return chats[i];
        }
      }
      return null;
    }
  };
});
