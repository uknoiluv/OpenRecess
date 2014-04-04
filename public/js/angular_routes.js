angular.module('angularAppRoutes', ['ui.router'])
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise('/angular_index.html');
  $stateProvider
  //splash page
  .state('splash', {
    url: '/splash',
    templateUrl: 'js/angular_views/splash.html'
  });

  //$locationProvider.html5Mode(true);
}]);
