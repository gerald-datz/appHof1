
// override the $.getScript() function so that it always creates an external reference rather than inline content.
// this is necesary to debug with firebug ... otherwise only numbered references of the scripts are created which can not be debugged properly
jQuery.extend({
   getScript: function(url, callback) {
      var head = document.getElementsByTagName("head")[0];
      var script = document.createElement("script");
      script.src = url + "?" + helper.timeActual();

      // Handle Script loading
      {
         var done = false;

         // Attach handlers for all browsers
         script.onload = script.onreadystatechange = function(){
            if ( !done && (!this.readyState ||
                  this.readyState == "loaded" || this.readyState == "complete") ) {
               done = true;
               if (callback){
                  callback();
               }
               // Handle memory leak in IE
               script.onload = script.onreadystatechange = null;
            }
         };
      }

      head.appendChild(script);

      // We handle everything using the script element injection
      return undefined;
   },
});

var testuser ="host";
var testpass="xkcuna9s";
var testuserid = 2;

// initialize map and set user position marker and define click function
var map;
var tiles;
// updateable user-Marker on Map
var meMarkerIcon;
var mePosMarker;

window.onresize = function(event) {
	//resizeDivs("automatic");
    app.screenChange();
}

var appIsMobile = false;

// intialize helper and app
$(document).ready(function() {
	helper.errorLog("document ready ...");
	
	// if this entity is the embedded one in the website - prevent scrolling of the frame while in app area
	/*if($("body").hasClass("fromWebsite")){
		helper.preventPageScroll($("html"));		
	}*/
	
	helper.initialize();
});

	
/**###################################################
			main app properties & methods
   ################################################### */
var app={
    /** general app parameters ------------------------------------ */
	name: 'AppHof',
	user: '',
	auth: 'anonymous',
    baseURL: 'http://fair.in-u.at/',
	serviceURL: 'http://fair.in-u.at/DesktopModules/inuFair/API/WS/',
	imageURL: 'http://fair.in-u.at/bbimagehandler.ashx',
    imageUserURL: 'http://fair.in-u.at/profilepic.ashx',
	/** persistent data objects ----------------------------------------------- */
    obj: {
        user:{},
        categorys:{},
        locations:{}
    },
    initialize: function () {
        $("#pageTitle").text($(".page.active").attr("pghead"));
		helper.errorLog("app initialize...");
		// initially do not show password cleartext in settings
		$("#settingsUserShowPass").prop("checked",false);
		
		//bind handler for menu items click functions
        app.bind();
		
		// app start procedure
		if (helper.online.state){
					
			// autologin ?
			var urlauth =  helper.urlparam.get("a");
			if (urlauth == ""){
				// not called from website
				$("body").removeClass("fromWebsite");				
			}
			else if (urlauth == "noauth"){
				// called from website, but not logged in
				$("body").addClass("fromWebsite");
			}
			else{
				//called from website with auth
				$("body").addClass("fromWebsite");				
			}
			
			if(helper.settings.get("AutoLogin") == true || ( urlauth != "" && urlauth != "noauth" ) ){
				// get logindata
				if (urlauth != "" && urlauth != "noauth"){
					app.auth = urlauth;
					app.login(
						function(result){
							// callback from login function
							if (result != "failed"){
								//nothing to do ... everyting ok
								helper.errorLog("login success from url");
							}
							else{
								//login failed - show message - show loginForm?
								helper.errorLog("login failed from url");
								app.logout();			
								app.loginerror();			
							}
						}					
					);		
				}
				else if (urlauth == "noauth"){
					helper.errorLog("login failed from url because user not logged in on website");
					app.logout();			
				}
				else{
					var us = helper.settings.get("UserName");
					var pw = helper.settings.get("UserPass");
					if	(us != "" && us != false && pw != "" && pw != false){
						// got login from local store - try to login
						app.auth = Base64.encode(us + ":" + pw);
						app.user = us;
						app.login(
							function(result){
								// callback from login function
								if (result != "failed"){
									//nothing to do ... everyting ok
									helper.errorLog("login success from stored data");
								}
								else{
									//login failed - show message - show loginForm?
									helper.errorLog("login failed from stored data");
									app.loginerror();			
								}
							}					
						);								
					}
					else{
						// no login in local store
						helper.errorLog("login failed - no login in stored data");
						app.loginerror();
					}
				}
			}
			else{
				// do not autologin - use anonymous
				helper.errorLog("login not done - user wants to use anonymous");
				app.logout();			
			}
			app.appdata.online();
			
			// init the map screen and set markers if not present
			
				app.map.init();
		
		}
		else{
			// not online - use offline - do not try to load online data
			// is this the first start of the app? - if so - show message - first start needs mobile to load minimum offline data
			
			helper.errorLog("not online - entering offline mode");
			// else - use offline data in localstore
			app.appdata.offline();
			
			// init the map screen and set markers if not present
			if(typeof(map) == "undefined"){
				app.map.init();
			}
		}		
		// ############################ END OF APP.INITIALIZE !!! #############################		
	},
    // MENU clicks and header button clicks binding
	bind: function () {
		helper.errorLog("app bind...");
                
        // bind menu buttons click handler
        $("#btn-menu").off("click");
        $("#btn-menu").on("click",function(){ 
			app.menu.toggle();
        });
		
		$("#exitBtn").off("click");
		$("#exitBtn").on("click",function(){
			app.exit();
			app.menu.close();
        });
		
		// bind menu items & header Buttons click handler
		$(".btn-pg").off("click");
		$(".btn-pg").on("click",function(){
			app.menu.close();
            app.page.show($(this).attr("rel"));
        });
        
		$("#menuCloseTop").off("click");
		$("#menuCloseTop").on("click",function(){
			app.menu.close();
        });
		
		// login and logout buttons
		$("#menu-login").off("click");
		$("#menu-login").on("click",function(){
			// get logindata
			var us = helper.settings.get("UserName");
			var pw = helper.settings.get("UserPass");
			if	(us != "" && us != false && pw != "" && pw != false){
				// got login from local store - try to login
				app.auth = Base64.encode(us + ":" + pw);
				app.user = us;
				app.login(
					function(result){
						// callback from login function
						if (result != "failed"){
							//nothing to do ... everyting ok
						}
						else{
							//login failed - show message - show loginForm?
							app.loginerror();			
						}
					}					
				);								
			}
			else{
				// no login in local store
				app.loginerror();
			}
        });
		$("#menu-logout").off("click");
		$("#menu-logout").on("click",function(){
			app.logout();
        });
		
		// bind search input keyup & button
		$("#searchMain").unbind('keyup').keyup(function(e) {
			var code = e.keyCode || e.which;
			if(code == 13) { //Enter pressed - search now
			   app.search.result($("#searchMain").val());
			}
			else{
				app.search.suggest($("#searchMain").val());
			}
		});
		$("#searchNow").off("click");
		$("#searchNow").on("click",function() {
			app.search.result($("#searchMain").val());
		});	
		
	},    
	appdata:{
		vis: 0,
		vistarget: 3,
		bg: 0,
		maxtrials: 10,  // 10 times maximum retrytimeouts
		tried: 0,
		checkvis: function(){
			if (app.appdata.vis >= app.appdata.vistarget){
				helper.splash.hide();
				helper.spinner.hide();
			}
			else{	
				app.appdata.tried++;
				// ensure the splash disappears after at least 10 seconds
				if (app.appdata.tried >= app.appdata.maxtrials){
					helper.splash.hide();
					helper.spinner.hide();
					// end interval
				}
				else{					
					setTimeout(function () {
						// hide the splash screen after all visible data is loaded or failed?
						app.appdata.checkvis();
					}, helper.retryTimeOut);
				}
			}
		},
		online:function(initial){			
			// load online data	-----------------------------------  TODO ###############################################################
			// load visible data and hide splash afterwards
			app.appdata.vis=0;
			app.appdata.checkvis();
			/** ------------------------------------------------------------------
					load visible and necessary items for the app		
			---------------------------------------------------------------------- */
			// get persistent data objects for later use
			helper.dataAPI("getData","categorys",{},function(err,data){
				if(!err){
					app.obj.categorys = data;
					app.appdata.vis++;
				}
				else{
					helper.errorLog(err);
				}
			});                
			helper.dataAPI("getData","locations", {},function(err,data){
				if(!err){
					app.obj.locations = data;
					app.appdata.vis++;
				}
				else{
					helper.errorLog(err);
				}
			});     
			
			// load actual tipps
			app.tipp.list("tippsList","box");
			
			
			/** ------------------------------------------------------------------
				load all other background items - app is now ready to be used		
			---------------------------------------------------------------------- */
			app.appdata.bg = 0;
			//get the data for admin functions if applicable
			helper.dataAPI("getData","adminpage", {},function(err,data){ 
				if(!err){
					$("#admin-page").empty();
					$("#admin-page").append(data);
					$("#menu-admin").removeClass("hidden");
					app.appdata.bg++;
				}
			});
			//get the data for seller functions if applicable
			helper.dataAPI("getData","sellerpage", {},function(err,data){ 
				if(!err){
					$("#seller-page").empty();
					$("#seller-page").append(data);
					$("#menu-seller").removeClass("hidden");
					app.appdata.bg++;
				}
			});
			
			// aktualisiere offlinedata für nächste offline verwendung
			
		},
		offline:function(){
			// check if neccessary offline data is present...
			// load offline data	-----------------------------------  TODO ###############################################################
		}
	},
	/** login functions */
	login: function(callback){
		// try to login
		// get the user info data
		helper.dataAPI("getData","userdata",{},function(err,data){
            if(!err){
                app.obj.user.UserID = data.UserID;
                app.obj.user.UserName = data.UserName;
                app.obj.user.DisplayName = data.DisplayName;
                app.obj.user.Email = data.Email;
                app.obj.user.Approved = data.Approved;
				loginfail = 0;
				app.menu.userinfo();
				// update user image and name in menu				
				callback('ok');
            }
            else{
				app.logout();
				app.loginfail++;
                helper.errorLog(err);
				callback('failed');
            }
        });   
	},
	loginfail: 0,
	loginerror: function(){
		var markup = "<p class='red'>Sie haben noch keine Zugangsdaten? Registrieren Sie sich kostenlos und profitieren Sie von vielen nützlichen Funktionen der App.</p><p class='blue'>Wenn Sie bereits Zugangsdaten haben kontrollieren Sie bitte die Einstellungen und versuchen Sie erneut sich anzumelden.</p>";
		helper.popup.show('Ungültige Anmeldedaten',
				markup,
				'et et-user',
				true,
				true,
				function () { // callback from SETTINGS button
					app.logout();	
					app.page.show("settings");
					helper.popup.hide();
					app.menu.close();
				},
				function () { // callback REGISTER button
					app.logout();	
					app.page.show("signup");
					helper.popup.hide();
					app.menu.close();
				},
				"EINSTELLUNGEN",
				"REGISTRIEREN"
		);		
	},
	logout:function(){
		// clear userinfo
		app.obj.user = {};
		app.user = '';
		app.auth = 'anonymous'
		app.menu.userinfo();
	},
	/** page and menu functions ------------------------------------ */
    screenChange:function(){         
        helper.screen.height = helper.check.screen.height();
        helper.screen.width = helper.check.screen.width();
        	
      
           app.map.refresh();
      
    },
	page: {
        show: function(pageName){
            //close all menus which are open to show whole content afer menu click
            $(".menu-main.open").removeClass("open"); 
			var actPage = $(".page[rel=" + pageName + "]");
            var pageTitle = actPage.attr("pghead");
            // set all pages to inactive
            $(".page").removeClass("active");			
            $(".btn-pg").removeClass("active");
			
            // set selected page to active
			actPage.addClass("active");
            $(".btn-pg[rel=" + pageName + "]").addClass("active");
			
            // set page title to selected page´s pghead tag
            app.page.setTitle(pageTitle);
			
			//helper.screen.update($(".page[rel=" + pageName + "]"));
						
            // hack for the map to show up correctly, because hidden map will not update properly
            if(pageName == "map"){
                if (map){
                    //map.invalidateSize(false);
                    map.invalidateSize(false);
                }
            }  
        },
        setTitle: function(theTitle){
            $("#top-title").text(theTitle);
        }
    },
    // common menu & slideup functions
	menuKeyDown:function(){
		app.menu.toggle();
	},
	menu: {
		userinfo: function(){
			if (typeof(app.auth) == "undefined" || app.auth == '' || app.auth == 'anonymous'){
				$("#menu-user-image").attr("src", "img/no_avatar.gif");
				$("#menu-user-name").text("nicht angemeldet");
				// hide logout, show login
				$("#menu-login").removeClass("hidden");
				$("#menu-logout").addClass("hidden");
			}
			else{
				if (app.obj.user.UserID != 'undefined' && app.obj.user.UserID != undefined){
					$("#menu-user-image").attr("src", app.imageUserURL + "?userId=" + app.obj.user.UserID + "&h=100");
					$("#menu-user-name").text(app.obj.user.UserName);
					// hide login, show logout
					$("#menu-login").addClass("hidden");
					$("#menu-logout").removeClass("hidden");
				}
				else{
					$("#menu-user-image").attr("src", "img/no_avatar.gif");
					$("#menu-user-name").text("nicht angemeldet");
					// hide logout, show login
					$("#menu-login").removeClass("hidden");
					$("#menu-logout").addClass("hidden");
				}				
			}
		},
		open: function(){
			// scroll to top of menu on open
			$("#menu .menu-main").scrollTop(0);
			$("#menu").addClass("open");
		},
		close: function(){
			$("#menu").removeClass("open");
		},
		toggle: function(){
			var theMenu = $("#menu");
			if(theMenu.hasClass("open")){
				app.menu.close();
			}
			else{		
				app.menu.open();
			}
		}
	},
    //add functions for history in the app via the back-key
    backKeyDown: function() {
		//history.back , .forward, .length
		//location.href, .host (www.google.com), .hash ="test" -> location.hash -> "#test"   #############################################################
		if ( $("#menu").hasClass("open") ){
			app.menu.close();
		}
		else if ( $("#popup").hasClass("visible") ){
			helper.popup.hide();
		}
		else if ( $(".page.active:first").attr("rel") == "start" && appIsMobile == true ){
			// ask if to exit if app - sure ?
			helper.popup.show(  "AppHOF beenden" ,                                        // overlay title
						"<p>Sind Sie sicher, dass Sie die App beenden möchten ?<p>",     // overlay textarea
						'',                                        				// image for title row (auto resized to 20x20 px)
						true,                                                  	// show OK button?
						true,                                                   // show CANCEL button?
						function(){												// callback function to bind to the OK button
							navigator.app.exitApp();
						},                       
						function(){helper.popup.hide();} ,"JA","NEIN"           // callback function to bind to the CANCEL button
					);
		}
		else{
			// back in page history
			
		}
		
	},
	exit: function(){
		
		/*
		//helper.popup.show(title, content, iconname, ok, cancel,callbackOk,callbackCancel){
		helper.popup.show(  "AppHOF beenden" ,                                        // overlay title
						"<p>Sind Sie sicher, dass Sie die App beenden möchten ?<p>",     // overlay textarea
						'',                                        				// image for title row (auto resized to 20x20 px)
						true,                                                  	// show OK button?
						false,                                                  // show CANCEL button?
						function(){												// callback function to bind to the OK button
							navigator.app.exitApp();
						},                       
						function(){helper.popup.hide();} ,"AppHOF beenden"                   // callback function to bind to the CANCEL button
					);
		*/
		navigator.app.exitApp();
	},
    // search functions
	search:{
		suggest: function(searchstring){
			//get the data and handle callback
                helper.dataAPI("getSuggest","no", {'n': 10, 's': searchstring},function(err,data){ 
                    if(!err){
						$("#searchSuggests").empty();
						var suggestions = "";		
						$.each(data, function(){
							var item = this;
							var icon = "";
							var text="";
							var onclick="";
							switch(item.ObjectTypeID){
								case '1': 
									icon = 		"user";
									text = 		"Seller";
									onclick = 	"app.seller.show(" + item.ObjectID + ");";
									break;        
								case '2': 
									icon = 		"landscape-doc";
									text = 		"Product";
									onclick = 	"app.product.show(" + item.ObjectID + ");";
									break;        
								case '3': 
									icon = 		"vcard";
									text = 		"SellerProduct";
									onclick = 	"app.seller.product.show(" + item.ObjectID + ");";
									break;        
								case '4': 
									icon = 		"text-doc";
									text = 		"Category";
									onclick = 	"app.category.show(" + item.ObjectID + ");";
									break;        
								case '5': 
									icon = 		"location";
									text = 		"Location";
									onclick = 	"app.location.details.show(" + item.ObjectID + ");";
									break;        
								case '6': 
									icon = 		"flag";
									text = 		"Tipp";
									onclick = 	"app.tipp.show(" + item.ObjectID + ");";
									break;        
								default:
									icon = 		"help";
									text = 		"undefined object";
									onclick = 	"";
									break;
							}
							suggestions += "<div id='searchSuggestsList' class='tr' onclick='" + onclick + "' title='" + text + "'>";
							suggestions += 	"<div class='td ellipsis align-center vertical-middle'>";	
							suggestions +=		"<i class='et et-" + icon + " fa fa-" + icon + " btn-icon'></i>";	
							suggestions += 	"</div>";							
							suggestions += 	"<div class='td ellipsis align-left vertical-middle'>";
							suggestions += 		item.Name + ", " + item.InfoName;
							suggestions += 	"</div>";
							suggestions += 	"<div class='td align-center vertical-middle'>";
							suggestions += 		"<i class='et et-chevron-right btn btn-icon'></i>";
							suggestions += 	"</div>";
							suggestions += "</div>";
						});
						$("#searchSuggests").append(suggestions);
						$(".ellipsis").ellipsis();
					}
                    else{
                        helper.errorLog(err);
                    }
                });
		},
		result: function(searchstring){
		
		},
		select: function(resultID){
		
		}
	},
    // map page functions
    map: {
		zoom: 9,
        init: function(){
			
			helper.errorLog("map init ...");
            // init Map - workaround for map size bug
            $('#map').height($(document).height());
            $('#map').width($(document).width());

            //initialize the map page
            tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }), latlng = new L.LatLng(parseFloat(helper.gps.lat), parseFloat(helper.gps.lon));

            map = L.map('map', {center: latlng, zoom: app.map.zoom, layers: [tiles]});
            app.map.markersSet();

			// define meMarker - this is a special "updateable" marker for the users positon hat will be updated by a interval and not set over and over again 
			var meIcon = L.Icon.extend(
			{
				options: {
					iconUrl: 	'img/userpos32.png',
					iconSize: 	new L.Point(32, 32),
					iconAnchor: new L.Point(14, 14),
					shadowUrl: 	'img/blank16.png',
					shadowSize: new L.Point(28, 28),
					popupAnchor:new L.Point(0, -12)
				}
			});
			meMarkerIcon = new meIcon(); 
			mePosMarker = new  L.LatLng(parseFloat(helper.gps.lat), parseFloat(helper.gps.lon)), mePosMarker = new L.Marker(mePosMarker,{icon: meMarkerIcon});
			mePosMarker.on('click',function(e){
				app.map.markerMe.click(e);
			});
			map.addLayer(mePosMarker);  
			
			
			// define click function on map
			map.on('click', app.map.click);
			
        },
		click:function(e){
			//helper.errorLog("You clicked the map at " + e.latlng);
		},
        refresh: function(){
            helper.errorLog("Refreshing Map");
            map.invalidateSize(false);
        },
        markersSet:function(){
            var markers = new L.markerClusterGroup();    
            //var markers = l.Marker();
            if (typeof(app.obj.locations) !== "undefined" && typeof(app.obj.locations.length) !== "undefined" && app.obj.locations.length != 0 ){
                helper.errorLog("Adding Markers");
                $.each(app.obj.locations,function(){
                    var item = this;
					
					/*var defaultMarkerIcon = L.Icon.extend({
						iconUrl: 'defaultmarker.png',
						iconSize: new L.Point(24, 24),
						shadowSize: new L.Point(10, 16),
						iconAnchor: new L.Point(2, 24)
					});
					
					var selectedMarkerIcon = L.Icon.extend({
						iconUrl: 'selectedmarker.png',
						iconSize: new L.Point(24, 24),
						shadowSize: new L.Point(10, 16),
						iconAnchor: new L.Point(2, 24)
					});
					
					
					var theIcon = new defaultMarkerIcon();*/
                    var marker = L.marker(new L.LatLng(item.CenterLat, item.CenterLon), {  title: item.Name, id: item.ID });
					marker.on('click',function(e){
						app.map.marker.click(e.target.options.id);
						});
                    //marker.bindPopup(title);	
                    markers.addLayer(marker);					
                });	
                map.addLayer(markers);
            } 
            else {
                 setTimeout(function () {
                    app.map.markersSet();
                 }, helper.retryTimeOut);
            }
        },
		mypos: function(){
			mePosMarker.setLatLng([parseFloat(helper.gps.lat),parseFloat(helper.gps.lon)]).update();
			map.setView(new L.LatLng(parseFloat(helper.gps.lat),parseFloat(helper.gps.lon)), app.map.zoom);
		},
		findpos: function(coordLat, coordLon, zoom){
			if(typeof(zoom) == "undefined"){
				zoom = app.map.zoom;
			}
			map.setView([coordLat, coordLon], zoom);
			//map.panTo(new L.LatLng(coordLat, coordLon));
		},
		marker:{
			// click on marker - show the details
			click: function(locID){
				app.location.details.show(locID);
			}
		},
		markerMe:{
			// click on marker - show the details
			click: function(e){
				app.map.markerMe.options();
			},
			options:function(){
				var markup = "<p>Das ist Dein Standort<p>";
				markup += "<div class='tippOptions table'>";
				markup += "  <div class='tr'>";
				markup += "     <span class='td tippDetails vertical-middle'>Position neu bestimmen</span>";
				markup += "     <span class='td tippDetails align-center vertical-middle btn-icon'><i class='btn fa fa-map-marker'></i></span>";
				markup += "  </div>";
				markup += "  <div class='tr'>";
				markup += "     <span class='td tippDetails vertical-middle'>Was ist in der Nähe?</span>";
				markup += "     <span class='td tippDetails align-center vertical-middle btn-icon'><i class='btn fa fa-flag-o'></i></span>";
				markup += "  </div>";
				markup += "</div>";
				helper.popup.show(  "Dein Standort" ,                           // overlay title
						markup,     											// overlay textarea
						'fa fa-child',                                     		// image for title row (auto resized to 20x20 px)
						false,                                                  	// show OK button?
						false,                                                  // show CANCEL button?
						function(){												// callback function to bind to the OK button
							helper.popup.hide();},                       
						function(){helper.popup.hide();} ,"",""                   // callback function to bind to the CANCEL button
					);
			}
		}
    },
    // location functions
    location:  {
        details:{
            // slideUp Location Details for a specified locationID
			show:function(locID){
				helper.dataAPI("getData","locationdetails", {'i': locID},function(err,dataObj){
					if(!err){
						var data = dataObj[0];
						var markup = "";
						markup += "<h2>Kontaktdaten:</h2>";
						markup += "<hr/>";
						if(data.Address && data.Address != ""){
							markup += "<table class='popupTable'><tr><td><i class='et et-home'></i></td>";
							markup += "<td>&nbsp;" + data.Zip + " " + data.City + "</td></tr>";
							markup += "<tr><td>&nbsp;</td><td>&nbsp;" + data.Address + "</td></tr>";
							markup += "</table>";
						}                
						markup += "<table class='popupTable'>";
						if(data.Phone && data.Phone != ""){                    
							markup += "<tr><td>";
							markup += "<i class='fa fa-phone'></i></td>"
							markup += "<td>&nbsp;<a href='tel:" + data.Phone.replace(/\s+/g, '') + "'>";
							markup += data.Phone + "</a>";
							markup += "</td></tr>";
						}
						if(data.Cell && data.Cell != ""){                  
							markup += "<tr><td>";
							markup += "<i class='fa fa-mobile'></i></td>"
							markup += "<td>&nbsp;<a href='tel:" + data.Cell.replace(/\s+/g, '');
							markup += "'>" + data.Cell + "</a>";
							markup += "</td></tr>";
						}                    
						if(data.Mail && data.Mail != ""){                  
							markup += "<tr><td>";
							markup += "<i class='fa fa-envelope'></i></td>"
							markup += "<td>&nbsp;<a href='mailto:" + data.Mail.replace(/\s+/g, '');
							markup += "'>" + data.Mail + "</a>";
							markup += "</td></tr>";
						}
						if(data.Web && data.Web != ""){                  
							markup += "<tr><td>";
							markup += "<i class='fa fa-globe'></i></td>";
							markup += "<td>&nbsp;";
							/* fix for InAppBrowser Issue on PG Build */
							if (helper.isMobileApp){
								markup += "<a href='#' onclick='event.preventDefault();openDeviceBrowser(" + '"' + data.Web.replace(/\s+/g, '') + '"' + ");'>";
							}
							else{
								markup += "<a href='http://" + data.Web.replace(/\s+/g, '') + "' target='_system'>"
							}							
							
							markup += data.Web ;
							var webshort = data.Web.replace(/\s+/g, '');
							if (  helper.left(webshort,4).toLowerCase() == "http"  ){
								// nothing to change
							}
							else if ( helper.left(webshort,4).toLowerCase() == "www." ){
								webshort = "http:\\\\" + webshort;   
							}
							else {
								// no valid URL prefix here ... so add http:\\
								webshort = "http:\\\\" + webshort;   
							}
							// change slashes to backslashes in url for bbimghandler
							webshort = webshort.replace(/\//g, "\\");   

							markup += "<div>";
							markup += "<img style='border: 1px solid #eee;' src='" + app.imageURL + "?Url=" + webshort + "&height=100&ratio=screen' />";
							markup += "<img class='hide-xs hide-sm' style='margin-left:10px;' src='" + app.imageURL + "?barcode=1&width=100&height=100&type=qrcode&content=" + encodeURIComponent(webshort) + "' />"; 
							markup += "</a>"; 
							markup += "</td></tr>";
						}

						markup += "</table>";
						markup += "<br/>";            
						if(data.Categorys != ""){
							markup+="<h2>Produktkategorien:</h2>";
							markup += "<hr/>";
							var Cats = data.Categorys.split(",");
							$.each(Cats, function(){
								var catID=this;
								if (catID > 0 && catID < 9999){						
								var catInfo = helper.getObjItem(app.obj.categorys,"ID",catID);
									if (catInfo){
										markup += "<span class='catIcon' style='color:" + catInfo.Color + ";background:" + catInfo.Background;
										markup += ";' title='" + catInfo.Name + "'>";
										markup += "<i class='flaticon-" + catInfo.Icon + "'></i>";
										markup += "</span>";
									}
								}
							});
							markup += "<br/>";
						}
						markup += "<h2>User-Bewertungen</h2>";
						markup += "<hr/>";
						markup += "<div id='votingswrapper'></div>";
						markup += "<br/>";
						if (data.DescLong != null ){
							markup += "<h4>Beschreibung</h4>";
							markup += data.DescLong;
						}
						if (app.obj.user.UserID == 0){
							// dont allow comments
							markup += "<h2>Kommentare</h2>";
						}
						else{
							markup += "<h4 class='relPos' >Kommentare";
							markup += "<i class='et et-comment float-right btn blue'  onclick='app.comment.add(5," + data.ID + ");' title='Kommentar hinzufügen'>";
							markup += "<span class='add'>+";
							markup += "</span>";
							markup += "</i>";							
							markup += "</h4>";
						}
						markup += "<hr/>";
						markup += "<div id='commentswrapper'></div>";
										
												
						helper.popup.show(  data.Name ,                                        // overlay title
                            markup,     // overlay textarea
                            '',                                        				// image for title row (auto resized to 20x20 px)
                            false,                                                  // show OK button?
                            false,                                                  // show CANCEL button?
                            function(){alert('ok clicked');},                       // callback function to bind to the OK button
                            function(){alert('cancel clicked');}                    // callback function to bind to the CANCEL button
						);
						
						app.voting.markup.getSum("votingswrapper",5,data.ID);
						app.comment.markup.get("commentswrapper",5,data.ID);
					}
					else{
						helper.errorLog(err);
					}
				});
			}
		}
    },
    // tipp functions
    tipp:{
        // get markup for most recent tipps - with lazy load - "wrapperID" is the id of the element that should hold the list
		list: function(wrapperID, style){
			// respect users preferences for tipps he/she wants to receive 
			// and the specified area(s)
			//get the data and handle callback
				var itemID = 0;
				var objecttypeID = 0;
                helper.dataAPI("getData","tipps", {'i': itemID, 'o':objecttypeID},function(err,dataset){
                   if(!err){
                        var markup = "";
						
						$.each(dataset,function(){
							var data = this;                  
							markup += "<li id='tippElem" + data.ID + "' class='tipps'>"; 
							markup += "	  <div class='tippsImage lazy height100' rel='" + data.ImageID + "'>";
							markup += "	  </div>";
							markup += "   <div class='tippsInner table'>";
							markup += "     <span class='tipps row1 tr'>";      
							markup += "       <span class='tipps table vertical-middle align-left'>";   
							markup += "         <span class='td tippsTop vertical-middle'>" + data.DateCreated + "</span>&nbsp;";        
							markup += "         <span class='td trashBtn btn btn-icon float-right vertical-middle align-center' rel='" + data.ID + "'><i class='et et-trash'></i></span>"; 
							markup += "         <span class='td optionsBtn btn btn-icon float-right vertical-middle align-center' rel='" + data.ID + "'><i class='et et-docs'></i></span>";
							markup += "       </span>";                                   
							markup += "     </span>";       
							markup += "     <span class='tipps row2 tr'>";      
							markup += "       <span class='tipps td vertical-middle align-center'>";                 
							markup += "			<span class='tippsHead'>" + data.Name + "</span>"; 
							markup += "			<span class='tippsSubhead'>" + data.InfoName + "</span>";  
							markup += "       </span>";       
							markup += "     </span>";          
							markup += "     <span class='tipps row3 tr'>";     
							markup += "       <span class='tipps td vertical-middle align-left'>";    
							markup += "       	<p class='tippsBottom'>";  								
							markup += "				<span class='tippsBottom'>" + data.DateFrom + " - " + data.DateTo + "</span>";              
							markup += "				<span class='tippsBottom small'>" + data.InfoDescShort + "</span>";              
							markup += "				<span class='tippsBottom small'>" + data.InfoDescLong + "</span>"; 
							markup += "       	</p>";  	
							markup += "       </span>";
							markup += "     </span>";                        
							markup += "	 </div>";                      
							markup += "</li>";  
						});     
					
						markup = markup.replace(/null/g,'');
                        $("#" + wrapperID ).html(markup);
                        // change order to "newest on top"
                        helper.reverseLi($("#" + wrapperID + " ul:first"));
						setTimeout(function(){
							// update default-images with the correct ones
							var theWrapperID = wrapperID;
							helper.image.update(theWrapperID);
							// update optionbuttons click handler
							var selector = $("#" + wrapperID + " span.optionsBtn");
							$.each(selector, function(){
								var sel = $(this);
								sel.off('click');
								sel.on("click",function(){
									app.tipp.options.popUp(sel.attr("rel"));
								});
							});
							
							selector = $("#" + wrapperID + " span.trashBtn");
							$.each(selector, function(){
								var sel = $(this);
								sel.off('click');
								sel.on("click",function(){
									var elemToHide = sel.closest("li.tipps");
									app.tipp.trash(sel.attr("rel"),elemToHide);
								});
							});
						},500);
						// note down that the data was loaded (for appstart)
						app.appdata.vis++;
                    }
                    else{
                        helper.errorLog(err);
                    }
                });
        },
		options:{
			popUp: function(tippID){
				var markup = "";
				markup += "<div class='tippOptions table' id='tippOptions'>";
				markup += "  <div class='tr'>";
				markup += "    <span class='td tippDetails vertical-middle'>";
				markup += "      Details zu diesem Tipp";
				markup += "    </span>";
				markup += "    <span class='td tippDetails align-center vertical-middle btn-icon'>";
				markup += "      <i class='btn et et-info'></i>";
				markup += "    </span>";
				markup += "  </div>";
				markup += "  <div class='tr'>";
				markup += "    <span class='td tippMap vertical-middle'>";
				markup += "      Auf der Karte zeigen";
				markup += "    </span>";
				markup += "    <span class='td tippMap align-center vertical-middle btn-icon'>";
				markup += "      <i class='btn et et-location'></i>";
				markup += "    </span>";
				markup += "  </div>";
				markup += "  <div class='tr'>";
				markup += "    <span class='td tippFavourite vertical-middle'>";
				markup += "      Zu den Favoriten hinzuf&uuml;gen";
				markup += "    </span>";
				markup += "    <span class='td tippFavourite align-center vertical-middle btn-icon'>";
				markup += "      <i class='btn et et-heart'></i>";
				markup += "    </span>";
				markup += "  </div>";
				markup += "  <div class='tr'>";
				if (appIsMobile){
					markup += "    <span class='td tippShare vertical-middle'>";
					markup += "      Diesen Tipp teilen";
					markup += "    </span>";
					markup += "    <span class='td tippShare align-center vertical-middle btn-icon'>";
					markup += "      <i class='btn et et-share'></i>";
					markup += "    </span>";
				}
				else{
					markup += "    <span class='td tippShareBrowser vertical-middle'>";
					markup += "       Tipp teilen";
					markup += "    </span>";
					markup += "    <span class='td tippShareBrowser align-center btn-icon'>";					
					markup += "      <i id='tippShareTW' class='btn ets ets-twitter'></i><br>";					
					markup += "      <i id='tippShareFB' class='btn ets ets-facebook'></i><br>";					
					markup += "      <i id='tippShareGP' class='btn ets ets-googleplus'></i><br>";					
					markup += "      <i id='tippSharePI' class='btn ets ets-pinterest'></i><br>";				
					markup += "      <i id='tippShareXI' class='btn fa fa-xing'></i><br>";				
					markup += "      <i id='tippShareLI' class='btn ets ets-linkedin'></i>";
					markup += "    </span>";
				}
				markup += "  </div>";
				markup += "</div>";
				
				helper.popup.show('Optionen',                                      
									markup,     
									'et et-docs',
									false,
									false,
									function(){ 
										// callback from OK button (hidden)									
									},                       
									function(){ // callback from CANCEL button
										// hide the overlay                
										//helper.popup.hide();
									}                    
				);
				app.tipp.options.bind(tippID);
			},
			bind:function(tippID){
				// bind functions to the options-buttons
				if( $("#tippOptions").length > 0 ){
					// its already there - get data for the tipp
					
					// find the elements and bind functions to the options
					var tippDetails = $("#tippOptions .tippDetails");
					tippDetails.off('click');
					tippDetails.on("click",function(){
						app.tipp.details(tippID);
					});
					var tippMap = $("#tippOptions .tippMap");
					tippMap.off('click');
					tippMap.on("click",function(){
						app.tipp.map(tippID);
					});
					var tippFavourite = $("#tippOptions .tippFavourite");
					tippFavourite.off('click');
					tippFavourite.on("click",function(){
						app.fav.add(tippID);
					});
					if( $("#tippOptions .tippShare").length > 0 ){
						var tippShare = $("#tippOptions .tippShare");
						tippShare.off('click');
						tippShare.on("click",function(){
							helper.share("TestMessage", "TestSubject" ,"http://in-u.at/Portals/0/inuLogoWEB.png", "http://in-u.at");
						});						
					}
					else{
						// use browser-sharing - buttons/links
						$("#tippShareTW").unbind('click');
						$("#tippShareFB").unbind('click');
						$("#tippShareGP").unbind('click');
						$("#tippSharePI").unbind('click');
						$("#tippShareXI").unbind('click');
						$("#tippShareLI").unbind('click');
						
						$("#tippShareTW").off("click");
						$("#tippShareTW").on("click",function(){
							window.open("https://twitter.com/intent/tweet?text=TITLE&url=http://in-u.at&via=TWITTER-HANDLE",'_system');
						});
						$("#tippShareFB").off("click");
						$("#tippShareFB").on("click",function(){
							window.open("http://www.facebook.com/sharer/sharer.php?u=http://in-u.at",'_system');
						});			
						$("#tippShareGP").off("click")
						$("#tippShareGP").on("click",function(){
							window.open("https://plus.google.com/share?url=http://in-u.at",'_system');
						});
						$("#tippSharePI").on("click");
						$("#tippSharePI").on("click",function(){
							window.open("http://pinterest.com/pin/create/button/?url=http://in-u.at&description=YOUR-DESCRIPTION&media=YOUR-IMAGE-SRC",'_system');
						});
						$("#tippShareXI").on("click");
						$("#tippShareXI").on("click",function(){
							window.open("https://www.xing-share.com/app/user?op=share;sc_p=xing-share;url=http://in-u.at",'_system');
						});
						$("#tippShareLI").on("click");
						$("#tippShareLI").on("click",function(){
							window.open("http://www.linkedin.com/shareArticle?mini=true&url=http://in-u.at&title=YOUR-TITLE&summary=YOUR-SUMMARY&source=http://in-u.at",'_system');
						});
					}
				}
				else{
					var theTippID = tippID;
					// delay this function
					setTimeout(function(){
						app.tipp.options.bind(theTippID);
					},helper.retryTimeOut);
				}
			}
		},
		details:function(tippID){
			// check what kind of tipp this is and what to show as details
			helper.dataAPI("getData","tipps", {'i': tippID, 'o': 0},function(err,dataset){ 
				if(!err){
					var data = dataset[0];					
					switch(data.ObjectTypeID){
						case 1: 
							app.seller.show(data.ObjectID);
							break;        
						case 2: 
							app.product.show(data.ObjectID);
							break;        
						case 3: 
							app.seller.product.show(data.ObjectID);
							break;        
						case 4: 
							app.category.show(data.ObjectID);
							break;        
						case 5: 
							app.location.details.show(data.ObjectID);
							break;        
						case 6: 
							app.tipp.show(data.ObjectID);
							break;        
						default:
							alert("undefined objectTypeID");
							break;
					}
				}
				else{
					helper.errorLog(err);
				}
				
			}); 
		},
		map:function(tippID){
			helper.dataAPI("getData","tipps", {'i': tippID, 'o': 0},function(err,dataset){ 
				if(!err){
					var data = dataset[0];					
					
				}
				else{
					helper.errorLog(err);
				}
				
			});
		},
		trash: function(tippID, jqElemToHide){
			// fade out li and hide after the CSS3 transition has finished --- only >= ie10  
			jqElemToHide.addClass("trashed");
			var element = document.getElementById(jqElemToHide.attr("id"));
			element.addEventListener("transitionend", function () {
			  jqElemToHide.remove();
			}, true);
			//jqElemToHide.animate({ width: 'toggle', height: 'toggle', opacity: 'toggle' }, 'slow');
			// add entry in db that this should not been shown anymore to this user
		}
    },
	fav:{
		add:function(favObject){
		
		},
		remove:function(favID){
		
		},
		details:function(favID){
		
		}
	},
    // getvotings for a specific element as a list - with lazy load
    /* objecttypeID:    "seller" -> 1,
                        "product" -> 2,
                        "sellerproduct" -> 3,
                        "category" -> 4,
                        "location" -> 5,
                        "tipp" -> 6,
    */
    voting: {
        markup:{
            getSum:function(wrapperID, objecttypeID, itemID){
                //get the data and handle callback
                helper.dataAPI("getData","uservotings-c", {'i': itemID, 'o':objecttypeID},function(err,dataset){ 
                    if(!err){
                        var markup = "<span class='votingsum'>";
                        var data = dataset[0];
                        if (isNaN(data.VotingAvg) || data.Voting <= -1 ){
                            // no number - no voting
                            markup += "<span class='votingcount'>keine Votings</span>";
                        }
                        else{
                            // calculate the stars - and add them to the markup
                            var voting = parseFloat(data.VotingAvg);
                            var votingFull = Math.floor(voting);
                            var count = 0
                            for (var i = 0; i < votingFull; i++) {
                                markup += "<i class='fa fa-star orange'></i>";
                                count++;
                            }
                            var votingDecimal= (voting -votingFull) *100;
                            if (Math.floor(votingDecimal) >= 50){
                                markup += "<i class='fa fa-star-half-o orange'></i>";
                                count++
                            }
                            for (var i = count; i < 5; i++) {
                                markup += "<i class='fa fa-star-o lightgray'></i>";
                            }
                            markup += "&nbsp;<span class='votingcount'> aus " + data.VotingCount + " Votings</span>";
                        }  
                        markup += "</span>";
                        $("#" + wrapperID ).html(markup);
                    }
                    else{
                        helper.errorLog(err);
                    }
                });
            }
        }
    },
	// comments functions
	comment:{
        add: function(objTypeID, objID){
            var theFields = {
                1:{
                    Name:   "Comment",
                    Label:  "Kommentar:",
                    Control: "textarea",
                    Options: {
                        Text: "",
                        Value: ""
                    }
                },
                2:{
                    Name:   "Voting",
                    Label:  "Bewertung (optional):",
                    Control: "select",
                    Options: {
                        1:{
                        Text: "1 Stern",
                        Value: "1"
                        },
                        2:{
                        Text: "2 Sterne",
                        Value: "2"
                        },
                        3:{
                        Text: "3 Sterne",
                        Value: "3"
                        },
                        4:{
                        Text: "4 Sterne",
                        Value: "4"
                        },
                        5:{
                        Text: "5 Sterne",
                        Value: "5"
                        }
                    }
                }
            };
            var markup = helper.form.show(theFields);
            helper.popup.show('Kommentar',                                      
                                markup,     
                                'no_avatar.gif',
                                true,
                                false,
                                function(){ // callback from OK button
                                    // save                                     
                                    var theParameters = {};
                                    theParameters.UserID = app.obj.user.UserID;
                                    theParameters.D = 0;
                                    theParameters.ObjectTypeID =objTypeID;
                                    theParameters.ObjectID = objID;
                                    theParameters.ParentID = 0;                
                                    theParameters.DateCreated = helper.datetimeDB();
                                    $.each(theFields, function(){
                                        var actfield = this;
                                        if (actfield.Control != "label" && actfield.Control != ""){
                                           theParameters[actfield.Name] = $("#inputmask [rel='" + actfield.Name + "']").val();
                                        }
                                    });
                                    var params = {v:theParameters};
                                    helper.dataAPI("setData","comment", params ,function(err,data){ 
                                        if(!err){                                            
                                            var result = data;
                                            if (data == "saved"){
                                                app.comment.markup.get("commentswrapper",objTypeID,objID);
                                                helper.popup.hide();
                                                helper.info.add("success","Danke, Kommentar / Voting wurde gespeichert!",true);
												//update voting sums
												app.voting.markup.getSum("votingswrapper",objTypeID,objID);
                                            }
                                            else{
                                                helper.info.add("warning","Kommentar / Voting konnte nicht gespeichert werden.<hr/><p>" + JSON.stringify(data) + 
                                                                "</p><hr/>Bitte versuchen Sie es nochmal",true);
                                            }
                                        }
                                        else{
                                            helper.errorLog(err);
                                            helper.info.add("error","Es ist ein Fehler aufgetreten:<hr/><p>" + JSON.stringify(data) + 
                                                            "</p><hr/>Bitte informieren Sie den Administrator",true);
                                            helper.popup.hide();
                                        }

                                    }); 
                                },                       
                                function(){ // callback from CANCEL button
                                    // clear and discard - just hide the overlay                
                                    // helper.popup.hide();
                                }                    
            );
        },
        markup:{
            get: function(wrapperID, objecttypeID, itemID){
                //get the data and handle callback
                helper.dataAPI("getData","usercomments", {'i': itemID, 'o':objecttypeID},function(err,dataset){
                   if(!err){
                        var markup = "<div class='comments'><ul class='comments'>";
                        $.each(dataset,function(){
                            var data = this; 
                            var votingMarkup = "";
                            if (isNaN(data.Voting) || data.Voting <= -1 ){
                                // no number - no voting
                                for (var i = 0; i < 5; i++) {
                                    votingMarkup += "<span class='votingcount'></span>";
                                }
                            }
                            else{
                                // calculate the stars - and add them to the markup
                                var voting = parseFloat(data.Voting);
                                var votingFull = Math.floor(voting);
                                var count = 0
                                votingMarkup += "<span class='votingsum'>";
                                for (var i = 0; i < votingFull; i++) {
                                    votingMarkup += "<i class='fa fa-star orange'></i>";
                                    count++;
                                }
                                var votingDecimal= (voting -votingFull) *100;
                                if (Math.floor(votingDecimal) >= 50){
                                    votingMarkup += "<i class='fa fa-star-half-o orange'></i>";
                                    count++
                                }
                                for (var i = count; i < 5; i++) {
                                    votingMarkup += "<i class='fa fa-star-o lightgray'></i>";
                                }
                                votingMarkup += "</span>";								
                            }
                            markup += "     </span>";  
                            markup += "</li>";  
                            markup += "<li class='comments'>";      
                            markup += "     <span class='comments col1'>";                                      
                            markup += "         <img class='profileSmall' src='" + app.imageUserURL + "?userId=" + data.UserID +  "&h=64&w=64'/><br/>";
                            markup += "         <span class='profileName'>" + data.DisplayName + "</span><br/>";                 
                            markup += "         <span class='createdDate'>" + data.DateCreated + "</span>"; 
                            markup += "     </span>";       
                            markup += "     <span class='comments col2'>";                  
                            markup += votingMarkup + "<br>";                
                            markup += data.Comment;       
                            markup += "     </span>";          
                            markup += "</li>";
                        });
                        markup += "</ul></div>";                        
                        $("#" + wrapperID ).html(markup);
                        // change order to "newest on top"
                        helper.reverseLi($("#" + wrapperID + " ul:first"));
                    }
                    else{
                        helper.errorLog(err);
                    }
                });
            },
            getSum: function(wrapperID, objecttypeID, itemID){
                //get the data and handle callback
                var markup = "";
                helper.dataAPI("getData","usercomments-c", {'i': itemID, 'o':objecttypeID},function(err,dataset){ 
                    if(!err){
                        var data = dataset[0];
                        markup = "<span class='commentcount'>";
                        if (isNaN(data) ){
                            // no number - ???
                            markup += "<span class='commentcount'>0</span>";
                        }
                        else{
                            markup += "<span class='commentcount'>" + data + "</span>";
                        }  
                        markup += "</span>";
                        return markup;
                    }
                    else{
                        helper.errorLog(err);
                    }
                        $("#" + wrapperID ).html(markup);
                });        
            }
        }
	}
};

/**###################################################
				Common Helper Functions
			should be called after deviceready
###################################################### */
var helper = {
	/** various status infos ------------------------------------ */
	online:{
		state: false,
		type: ""
	},
	screen:{
		width:100,
		height:100,
		maxpixel:0,
		update:function(jqElem){
			// this should fix issues on elements not redrawing on android screens
			// http://www.eccesignum.org/blog/solving-display-refreshredrawrepaint-issues-in-webkit-browsers
			var n = document.createTextNode(' ');
			jqElem.append(n);
			setTimeout(function(){n.parentNode.removeChild(n)}, 0);
		}
	},
	gps:{
		on: false,
		success: false,	// indicates if last gpsRequest was successful
		failed: 0,		// counts failed number of gps requests
		timeout: 5000, 	// timeout for trying to get GPS coordinates on gps check	
		lat: "48.20857355", // latitude Stephansdom
		lon: "16.37254714", // longitude Stephansdom
	},
	locale:{
		de: {
			shortname: 'DE-DE',
			currencycode: 'EUR',
			currencysign: '€',
			decimal:	',',
			thousands:	'.'
		},
		us: {
			shortname: 'EN-US',
			currencycode: 'USD',
			currencysign: '$',
			decimal:	'.',
			thousands:	','
		}
	},
	retryTimeOut: 500, // timeout for retrying to fetch remote data
    /** initialization and event binding ------------------------------------ */
    initialize: function(){
		// this is called on documentready:
		helper.errorLog("helper initialize ...");
		// document ready does not mean the device is ready and you can use phonegap functions
		
		// Allow Cross domain requests per ajax!
		$.support.cors = true;
		
		// check browser/app independent status infos
		helper.online.state = helper.check.online();
		helper.online.type = helper.check.network();
		
		helper.screen.width = helper.check.screen.width();
		helper.screen.height = helper.check.screen.height();
		helper.screen.maxpixel = helper.check.screen.maxpixel();
		
		if (helper.settings.get("GPS") == true){
			helper.check.gps();
		}
		
		// load settings
		helper.settings.load();
		
		/** bind buttons of common elements */
		// overlay - close
        $("#overlayHideBtn").on("click");
        $("#overlayHideBtn").on("click",function(){
            helper.popup.hide();
        });
		
		// settings page
		$("#settingsUserShowPass").on("click");
		$("#settingsUserShowPass").on("click",function() {
			if ($("#settingsUserShowPass").prop('checked')){
				$("#settingsUserPass").attr("type","text");
			}
			else{
				$("#settingsUserPass").attr("type","password");
			}
		});
		$("#settingsSave").on("click");
		$("#settingsSave").on("click",function() {
			helper.settings.save($("#settingsWrap"));
			app.page.show("start");
		});
		
		// now initialize the app and start over
		app.initialize();
    },
	check:{
		// check if this is the mobile app (true) or webapp (false)
		mobileapp: function(){
			return (typeof(cordova) !== 'undefined' || typeof(phonegap) !== 'undefined');
			/*return (window.cordova || window.PhoneGap || window.phonegap)
			&& /^file:\/{3}[^\/]/i.test(window.location.href)
			&& /ios|iphone|ipod|ipad|android/i.test(navigator.userAgent);*/
		},
		online: function(testurl){
			if (typeof(testurl) == "undefined" ||  testurl == ""){			
				testurl = "http://in-u.at/keepalive.aspx";
			}
			// IE vs. standard XHR creation
			var x = new ( window.ActiveXObject || XMLHttpRequest )( "Microsoft.XMLHTTP" ),s;
			x.open(
				// requesting the headers is faster, and just enough
				"HEAD",
				// append a random string to the current hostname,
				// to make sure we're not hitting the cache
				testurl + "/?rand=" + Math.random(),
				// make a synchronous request
				false
			);
			try {
				x.send();
				s = x.status;
				// Make sure the server is reachable
				return ( s >= 200 && s < 300 || s === 304 );
				// catch network & other problems
			} 
			catch (e) {
				return false;
			} 
		},	
		screen: {
			// init screen diminsions for overlays
			height: function(){
				return $(window).height() - 50;
			},
			width: function(){
				return $(window).width();
			},
			maxpixel:function(){
				var result = 0;
				if (helper.check.screen.width >= helper.check.screen.height){
					result = helper.screen.width;
				}
				else{
					result = helper.screen.height;
				}
				return result;
			}
		},
		// network connection state - available after DEVICEREADY
		network: function(raw){
			/*
			if (navigator.connection) {
				if (typeof(raw) != "undefined" &&  raw == true){			
					return navigator.connection.type;
				}
				else{
					var networkstate = navigator.connection.type;
					var states = new Array();    
					states[Connection.UNKNOWN]  = 'Unknown connection';
					states[Connection.ETHERNET] = 'Ethernet connection';
					states[Connection.WIFI]     = 'WiFi connection';
					states[Connection.CELL_2G]  = 'Cell 2G connection';
					states[Connection.CELL_3G]  = 'Cell 3G connection';
					states[Connection.CELL_4G]  = 'Cell 4G connection';
					states[Connection.CELL]     = 'Cell generic connection';
					states[Connection.NONE]     = 'No network connection';				
					return states[networkstate];
				}
			}
			else{
				if (typeof(raw) != "undefined" &&  raw == true){	
					return "";
				}
				else{
					return 'Unknown connection';
				}
			}
			*/
			return 'Unknown connection';
		},
		gps:function(){
			 // check if geolocation is available
			if (navigator.geolocation) {
				var timeoutVal = helper.gpsTimeout;
				navigator.geolocation.getCurrentPosition(
					function(position){
						// success
						helper.gps.lat = position.coords.latitude;
						helper.gps.lon = position.coords.longitude;
						//window.gpsAcc = position.coords.accuracy;
						helper.gps.success = true;
						helper.gps.failed = 0;
						helper.errorLog("gps positioned ...");
						//update user pos in map
						app.map.mypos();
					},
					function(){
						// error
						helper.gps.success = false;
						helper.gps.failed++; 
						helper.errorLog("gps failed " + helper.gps.failed + " times ...");                
					},
					{
						// gegolocation parameters
						enableHighAccuracy: true,
						timeout: timeoutVal,
						maximumAge: 0
					}
				);           
			} 
			else {
			   // ???
				alert("GPS not enabled or allowed");
				helper.gpsSuccess = false;
				helper.gpsFailed = helper.gpsFailed + 1;
			}
		}
	},	
	settings:{ // initially the main settings wrapper element has id "#settingsWrap"
		load: function(wrapperElem){
			if( typeof(wrapperElem) == "undefined" ){
				wrapperElem = $("#settingsWrap");
			}
			$.each(wrapperElem.find(".setting"),function(){
				var settingElem = $(this);
				var settingName = app.name + settingElem.attr("rel");
				var settingValue = helper.data.get(settingName);
				var settingControl = settingElem.get(0).tagName;
				
				if (settingValue != null && settingValue != "err" && settingValue != "" && settingValue != "undefined"){
					if (settingControl == "INPUT"){
						var settingType = settingElem.attr("type");
						switch(settingType){
							case 'text':
							case 'password':
								settingElem.val(settingValue);
								break;
							case 'checkbox':
								settingElem.prop("checked",settingValue);
								break;
							default: 
								// label - only has a  text - no control
								break;								
						}
					}
					else if (settingControl == "SELECT"){
						settingElem.val(settingValue);
					}
					else if (settingControl == "TEXTAREA"){
						settingElem.text(settingValue);
					}
				}
				else{
					settingElem.val("");
				}
			});
			helper.errorLog("settings loaded");
		},
		save: function(wrapperElem){
			if( typeof(wrapperElem) == "undefined" ){
				wrapperElem = $("#settingsWrap");
			}
			$.each(wrapperElem.find(".setting"),function(){
				var settingElem = $(this);
				var settingName = app.name + settingElem.attr("rel");
				var settingValue;
				var settingControl = settingElem.get(0).tagName;
								
				if (settingControl == "INPUT"){
					var settingType = settingElem.attr("type");
					switch(settingType){
						case 'text':
						case 'password':
							settingValue = settingElem.val();
							break;
						case 'checkbox':
							settingValue = settingElem.prop("checked");
							break;
						default: 
							// label - only has a  text - no control
							break;								
					}
				}
				else if (settingControl == "SELECT"){
					settingValue = settingElem.val();
				}
				else if (settingControl == "TEXTAREA"){
					settingValue = settingElem.text();
				}
				helper.data.set(settingName,settingValue);
			});
			helper.errorLog("settings saved");
			//helper.errorLog("...trying to log in");
			//app.login();
			//helper.initialize();
		},
		get: function(setting){
			var settingName = app.name + setting;
			var setVal = helper.data.get(settingName);
			if(setVal == "true"){
				setVal = true;
			}
			if(setVal == "false"){
				setVal = false;
			}
			return setVal;
		},
		set: function(setting,settingValue){
			var settingName = app.name + setting;
			helper.data.set(settingName,settingValue);
		}
	},
	/** objectslist - get object´s value by key ------------------------------------------- */
	getObjItem: function(obj, key, value) {
		for (var i = 0; i < obj.length; i++) {
			if (obj[i][key] == value) {
				return obj[i];
			}
		}
		return null;
	},
	/** data - local data ------------------------------------------- */
	data:{
		get: function(key){
			if(typeof(Storage) !== "undefined") {
				/*
				if (localStorage !== null && localStorage.getItem(key) !== null) {
				  return window.localStorage.getItem(key);	
				}
				else{
					// Sorry! No Web Storage support..
					return "err";
				}
				*/
				return localStorage.getItem(key);	
							
			} else {
				// Sorry! No Web Storage support..
				return "err";
			}
		},
		set: function(key,val){
			if(typeof(Storage) !== "undefined") {
				/*
				if (localStorage !== null && localStorage.getItem(key) !== null) {
					window.localStorage.setItem(key, val);
					return "ok";
				}
				else{
					// Sorry! No Web Storage support..
					return "err";
				}
				*/
				localStorage.setItem(key, val);
				return "ok";
			} else {
				// Sorry! No Web Storage support..
				return "err";
			}		
		}
	},	
	/** dataAPI (ajaxPOST) - remote data ------------------------------------------- */
    dataAPI: function(RESTname,dataname,parameters,callback){
        var ajaxURL = app.serviceURL + RESTname;
        var baseparams = {
                a: app.auth
            };
        var ajaxparams ={};
        var dataparam ={d: dataname};
        jQuery.extend(ajaxparams, dataparam, baseparams, parameters);
        $.ajax({
            url: ajaxURL,
			cache: false,
            dataType: "json",
            type: "POST",
            data: JSON.stringify(ajaxparams),
            success: function (data) {
                callback(null,data);
            },
            error:function(data){
                callback(data);
            }
        });
    },
    // image lazy update
    image:{
        /**  update all images or backgrounds with the class "lazy" within a wrapper
            first generate markup 
                <div id="wrapperID"><img class='lazy' rel='1' src='' width='150'/>...</div>
            rel should hold the image-id from the db 
            after inserting the generated markup in the DOM call: helper.imageupdate("wrapperID");
        */
        update: function(wrapperID, originalSize){
            // iterate over the images in the wrapper
			var theSelector = $("#" + wrapperID + " .lazy");
            $.each(theSelector, function(){
                var theImage = $(this);
                var imageID = theImage.attr("rel");
                // get imagedetails and build handlerURL and relevant tags
                helper.dataAPI("getData","images", {'i': imageID},function(err,imgObjs){
                    var imageToChange = theImage;   
                    if(!err){
						var imgObj = imgObjs[0];
						var theURL = app.imageURL + "?File=IMG/" + imgObj.FilePath
									+ "/" + imgObj.FileName + "." + imgObj.FileType ;
									
						var maxImageWidth = 0;
						if (typeof(originalSize) == "undefined" || originalSize == false){
							maxImageWidth = helper.screen.maxpixel;
						}
						else
						{
							// load in original size
							maxImageWidth = imageToChange[0].width;
						}
						if ( imageToChange.is("img")){							
								// change image parameters (load image in maximum needed size)
								theURL = theURL +  "&width=" + maxImageWidth;
								imageToChange.attr("src",theURL);
								imageToChange.attr("title", imgObj.Title);
								imageToChange.attr("alt", imgObj.Alt);
						}
						else{
							// change background of element
							if( theImage.hasClass("height100") ){
								// 100% height
								if (typeof(originalSize) == "undefined" || originalSize == false){
									imageToChange.css({'background': 'url(' + theURL + '&height=' + maxImageWidth + ') no-repeat','background-size': 'auto 100%', 'background-position':'center center'});
								}
								else{
									imageToChange.css({'background': 'url(' + theURL + ') no-repeat','background-size': 'auto 100%', 'background-position':'center center'});
								}
							}
							else{
								// 100% width
								if (typeof(originalSize) == "undefined" || originalSize == false){
									imageToChange.css({'background': 'url(' + theURL + '&width=' + maxImageWidth +  ') no-repeat','background-size': '100% auto', 'background-position':'center center'});
								}
								else{
									imageToChange.css({'background': 'url(' + theURL + ') no-repeat','background-size': '100% auto', 'background-position':'center center'});
								}
								
							}
						}
                    }
                    else{
                        helper.errorLog(err);
                    }
                });
            });        
        }
    },
	/** overlays, spinners and messageboxes 
    ------------------------------------ */
    //  USAGE example:                                                              // Description of parameters
    /*  -----------------------------------------------------------------------------------------------------------------------------
        helper.popup.show( 'Overlay Title',                                        // overlay title
                            'this is the content<br/>And this is another line',     // overlay textarea
                            'no_avatar.gif',                                        // image for title row (auto resized to 20x20 px)
                            true,                                                   // show OK button?
                            true,                                                   // show CANCEL button?
                            function(){alert('ok clicked');},                       // callback function to bind to the OK button
                            function(){alert('cancel clicked');}                    // callback function to bind to the CANCEL button
        );
    */
	splash:{
		show:function(){
			$("#splash").addClass("visible");
		},
		hide:function(){
			$("#splash").removeClass("visible");
		}
	},
	popup:{
        show: function(title, content, iconname, ok, cancel,callbackOk,callbackCancel,okText,cancelText){
            var theOverlay = $("#popup");

            // set title, content and icon
            if (typeof(title) != "undefined"){ 
                theOverlay.find(".popup-title").html(title);
            }
            if (typeof(content) != "undefined"){ 
                theOverlay.find(".popup-inner").html(content);
            }
			
            if (typeof(iconname) != "undefined"){ 
				// add a icon to the title
				$(".popup-icon").empty().append("<i class='" + iconname + "'></i>" );
            }
            if (typeof(ok) == "undefined" && typeof(cancel) == "undefined"){
                theOverlay.find(".overlayButtons").hide();
            }
            else{
                theOverlay.find(".popup-buttons").show();
                var okBtn = theOverlay.find(".btn-ok:first");
                var cancelBtn = theOverlay.find(".btn-cancel:first");
                if (typeof(ok) != "undefined"){ 
                    if(ok == true){
						okBtn.find(".btn-text").text("speichern");
						if (typeof(okText) != "undefined"){ 
							okBtn.find(".btn-text").text(okText);
						}
                        okBtn.show();
                        if (typeof(callbackOk) != "undefined"){ 
                            okBtn.off('click');
                            okBtn.on("click",function(){
                                callbackOk();
                            });
                        }
                        else{
                            // bind close function
                            okBtn.off('click');
                            okBtn.on("click",function(){
                                helper.popup.hide();
                            });
                        }
                    }
                    else{				
                        okBtn.hide();
                    }
                }
                else{			
                    okBtn.hide();
                }
                if (typeof(cancel) != "undefined"){ 
                    if(cancel == true){	
						cancelBtn.find(".btn-text").text("abbrechen");
						if (typeof(cancelText) != "undefined"){ 
							cancelBtn.find(".btn-text").text(cancelText);
						}
                        cancelBtn.show();
                        if (typeof(callbackCancel) != "undefined"){ 
                            cancelBtn.off('click');                        
                            cancelBtn.on("click",function(){
                                callbackCancel();
                            });
                        }
                        else{
                            // bind close function
                            cancelBtn.off('click');                        
                            cancelBtn.on("click",function(){
                                helper.popup.hide();
                            });
                        }
                    }
                    else{
                        cancelBtn.hide();
                    }
                }
                else{
                    cancelBtn.hide();
                }
				
				// check if only one btn is visible to correct missing border radius on single button
				if($(".popup-buttons span:visible").size() < 2){
					$(".popup-buttons span").addClass("btn-single");
				}
				else{					
					$(".popup-buttons span").removeClass("btn-single");
				}
            }
			//transition effect    
            /*$('#mask').fadeIn(500);
            $('#mask').fadeTo("fast", 0.9);*/
			$('#mask').addClass("visible");
            
			//Set height and width to mask to fill up the whole screen
            $('#mask').css({ 'width': helper.screen.width, 'height': helper.screen.height + 50 });

            
            theOverlay.show();
			
			var popupH = theOverlay.outerHeight();
			var popupW = theOverlay.outerWidth();
			
            var topPos = (helper.screen.height - popupH) / 2;
            if (topPos < 10) {
                topPos = 10;
            }
            var leftPos = (helper.screen.width - popupW) / 2;
            if (leftPos < 10) {
                leftPos = 10;
            }
            theOverlay.css({'top': topPos + 'px','margin-left': leftPos + 'px','margin-left': leftPos + 'px'});
			theOverlay.addClass("visible");
        },
        hide: function(){	
            var theOverlay = $("#popup");
            //$("#mask").fadeOut(500);
			$('#mask').removeClass("visible");
            theOverlay.hide();	
			
			theOverlay.removeClass("visible");
        }
    },    
    spinner:{
        queue: 0,
        timeout: 5000,
        show: function(showModal,autohide){
            helper.spinner.queue = helper.spinner.queue + 1;
            if( typeof(showModal) != "undefined" && showModal == true){                
                $("#spinnermask").addClass("visible");
                $("#spinner").addClass("visible");
            }
            else{
                $("#spinner").addClass("visible");
            }
            if( typeof(autohide) != "undefined" && autohide == true){                
                setTimeout(helper.spinner.hide,helper.spinner.timeout);
            }            
        },
        hide: function(){
            helper.spinner.queue = helper.spinner.queue - 1;
            if (helper.spinner.queue <= 0){
                helper.spinner.queue = 0;
                $("#spinnermask").removeClass("visible");               
                $("#spinner").removeClass("visible");
            }
        }
    },
    info:{
        lastID:0,
        timeout: 5000,
        add: function(infotype, infotext, autohide){
            helper.info.lastID = helper.info.lastID + 1;
            var markup = "<span rel='" + helper.info.lastID + "' class='infoelement ";
            var classTmp = "";
            var iconTmp = "";
            switch(infotype){
                case 'info': 
                    classTmp= "blue-bg-t7 white";
                    iconTmp = "<i class='et et-info'></i>&nbsp;&nbsp;";
                    break;
                case 'success': 
                    classTmp= "green-bg-t7 white";
                    iconTmp = "<i class='et et-check'></i>&nbsp;&nbsp;";
                    break;
                case 'warning': 
                    classTmp= "orange-bg-t7 white";
                    iconTmp = "<i class='et et-warning'></i>&nbsp;&nbsp;";
                    break;      
                case 'error': 
                    classTmp= "red-bg-t7 white";
                    iconTmp = "<i class='et et-new'></i>&nbsp;&nbsp;";
                    break;                
                default: 
                    classTmp= "lightgray-bg-t7 darkgray";
                    iconTmp = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
                    break;
            }
            markup += classTmp + "'>";
            markup += "<span class='infoclose' onclick='$(this).parent().remove();'><i class='et et-cross'></i></span>";
            markup += iconTmp + infotext + "</span>";
            
            if( typeof(autohide) != "undefined" && autohide == true){                
                setTimeout(function(){
                    var theID = helper.info.lastID;
                    helper.info.hide(theID);
                },helper.info.timeout);
            }
            $("#info").prepend(markup);            
        },
        hide: function(id){
            $("span.infoelement[rel=" + id + "]").remove();
        }
    },
    form: {
		show: function(fields){
			var markup = "<div id='inputmask' class='inputform'>"; // start form table
			$.each(fields, function(){
				var theField = this;
				markup += "<div class='inputrow'>";  // row start          
				markup += "<div class='inputlabel'>" + theField.Label + "</div>";
				switch(theField.Control){
					case 'text':
						markup += "<div class='inputcontrol'><input type='text' rel='" + theField.Name + "' /></div>";
						break;
					case 'textarea':
						markup += "<div class='inputcontrol'><textarea cols='40' rows='4' rel='" + theField.Name + "'></textarea></div>";
						break;
					case 'select':
						markup += "<div class='inputcontrol select'><select rel='" + theField.Name + "'>";
						$.each(theField.Options, function(){
							var theOption = this;
							markup += "<option value='" + theOption.Value + "'>" + theOption.Text + "</option>";
						});
						markup += "</select></div>";
						break;
					case 'check':
						markup += "<div class='inputcontrol'><input type='checkbox' rel='" + theField.Name + "' /></div>";
						break;
					case "label": 
					default: 
						// label - only has a  text - no control
						break;
				}
				markup += "</div>"; // row end
			});
			markup += "</div>"; // form table end
			return markup;
		},
		fill:function(data,theFields){
			$.each(theFields, function () {
				var actfield = this;
				var actControl = $("#inputmask [rel='" + actfield.Name + "']");
				if (actfield.Control != "label" && actfield.Control != "") {
					// workaround for values not existing in the select-options-list:
					if (actfield.Control == "select" && !actControl.find("option[value='" + data[actfield.Name] + "']").length) {
						// option does not exist, select first entry of the list
						actControl.val(actControl.find("option:first").val());
					}
					else{
						actControl.val(data[actfield.Name]);
					}
				}
			});
		},
		save: function(theFields, objectTypeID, objectID, objectNameText, actionText){
			/* 	theFields:		Array of fields
				objectTypeID:	Type of object to save
				objectID:		The ID of the object (0=new)
				objectNameText:	for success and error messages eg. "Category" 
				actionText: 	performed action eg. "saved" or "updated" ... 
			*/
			var theParameters = {};
			if ( typeof(objectTypeID) == "undefined" ){
				objectTypeID = 0;
			}
			theParameters.ObjectTypeID = objectTypeID.toString();
			if ( typeof(objectID) == "undefined" ){
				objectID = 0;
			}
			theParameters.ObjectID = objectID.toString();
			if ( typeof(objectNameText) == "undefined" ){
				objectNameText = "";
			}
			if ( typeof(actionText) == "undefined" ){
				actionText = "done";
			}
			//theParameters.ParentID = 0;
			theParameters.DateCreated = helper.datetimeDB();
			$.each(theFields, function () {
				var actfield = this;
				if (actfield.Control != "label" && actfield.Control != "") {
					theParameters[actfield.Name] = $("#inputmask [rel='" + actfield.Name + "']").val();
				}
			});
			var params = {i: objectID, v: theParameters };
			var dataname = "";
			switch(objectTypeID){
				case 1: 
					dataname = "seller";
					break;        
				case 2: 
					dataname = "product";
					break;        
				case 3: 
					dataname = "sellerproduct";
					break;        
				case 4: 
					dataname = "category";
					break;        
				case 5: 
					dataname = "location";
					break;        
				case 6: 
					dataname = "tipp";
					break;        
				default:
					alert("undefined objectTypeID");
					break;
			}
			app.dataAPI("setData",dataname, params, function (err, data) {
				if (!err) {
					var result = data;
					if (data == "saved" || data== "updated") {
						helper.popup.hide();
						helper.info.add("success", objectNameText + " " + actionText + "!", true);
					}
					else {
						helper.info.add("warning", objectNameText + " nicht " + actionText + ".<hr/><p>" + JSON.stringify(data) +
										"</p><hr/>Bitte kontrollieren Sie die Eingaben und versuchen Sie es erneut.", true);
					}
				}
				else {
					app.errorLog(err);
					helper.info.add("error", "Es ist ein Fehler aufgetreten:<hr/><p>" + JSON.stringify(data) +
									"</p><hr/>Bitte informieren Sie den Administrator", false);
					helper.popup.hide();
				}

			});
		}
	},
    share: function(message, subject, image, link){
		/**	Sharing 
		Use Phones Share dialogue if accessible
		---------------------------------------
		<button onclick="window.plugins.socialsharing.share('Message only')">message only</button>
		<button onclick="window.plugins.socialsharing.share('Message and subject', 'The subject')">
			message and subject
		</button>
		<button onclick="window.plugins.socialsharing.share(null, null, null, 'http://www.in-u.at')">
			link only
		</button>
		<button onclick="window.plugins.socialsharing.share('Message and link', null, null, 'http://www.in-u.at')">
			message and link
		</button>
		<button onclick="window.plugins.socialsharing.share(null, null, 'http://www.in-u.at', null)">
			image only
		</button>
		// Hint: you can share multiple files by using an array as thirds param: ['file 1','file 2', ..]
		<button onclick="window.plugins.socialsharing.share('Message and image', null, 'http://www.in-u.at/images/srpr/logo4w.png', null)">
			message and image
		</button>
		<button onclick="window.plugins.socialsharing.share('Message, image and link', null, 'http://www.in-u.at/images/srpr/logo4w.png', 'http://www.in-u.at/')">
			message, image and link
		</button>
		<button onclick="window.plugins.socialsharing.share('Message, subject, image and link', 'The subject', 'http://www.in-u.at/images/srpr/logo4w.png', 'http://www.x-services.nl')">
			message, subject, image and link
		</button>

		Sharing on Webbrowser
		---------------------
			
		*/
			// only used if on mobile device, otherwise the link - method via web-browser is used
			// initially set all parameters to null for not used parts to ensure the proper function of the sharing plugin
			helper.errorLog("sharing pressed");
			var theMessage = null;
			var theSubject = null;
			var theImage = null;
			var theLink = null;
			if (typeof(message) != "undefined"){ 
                theMessage = message;
            }
			if (typeof(subject) != "undefined"){ 
                theSubject = subject;
            }
			if (typeof(image) != "undefined"){ 
                theImage = image;
            }
			if (typeof(link) != "undefined"){ 
                theLink = link;
            }
			window.plugins.socialsharing.share(theMessage, theSubject, theImage, theLink);
	},
	/** GUI & Controls ------------------------------------ */    
    /** select an option by Text or Value 
	 ------------------------------------ */
    selectByText: function(elementID, text) {
            $("#" + elementID + " option[text='" + text + "']").prop('selected', 'selected');
        },
    selectByValue: function(elementID, value) {
            $("#" + elementID + " option[value='" + value + "']").prop('selected', 'selected');
        },
    reverseLi:function(jqElemUL){
        var list = jqElemUL;
        var listItems = list.children('li');
        list.append(listItems.get().reverse());        
    },
    /** string operations helpers 
    ------------------------------------ */
    right: function(str, chr) {
        return str.slice(str.length - chr, str.length);
    },
    left: function(str, chr) {
        return str.slice(0, chr - str.length);
    },
    /** date and time helpers (depends on "helper.pad")
    ------------------------------------ */
    datetimeActual:function() {
        return helper.dateActual() + " " + helper.timeActual();
    },
    datetimeDB: function() {
        var now = new Date();
        var monthnumber = now.getMonth() + 1;
        var monthday = now.getDate();
        var year = now.getYear();
        var hour = now.getHours();
        var minute = now.getMinutes();
        var second = now.getSeconds();
        var ms = now.getMilliseconds();
        if (year < 2000) { year = parseInt(year) + 1900; }
        var dateString = year + 
                        "-" + helper.pad(monthnumber, 2) + 
                        "-" + helper.pad(monthday, 2) + 
                        "T" + helper.pad(hour, 2) + 
                        ":" + helper.pad(minute, 2) + 
                        ":" + helper.pad(second, 2) + 
                        "." + helper.pad(ms, 3);
        return dateString;
    },
    datetimeFile: function() {
        var now = new Date();
        var monthnumber = now.getMonth() + 1;
        var monthday = now.getDate();
        var year = now.getYear();
        var hour = now.getHours();
        var minute = now.getMinutes();
        var second = now.getSeconds();
        var ms = now.getMilliseconds();
        if (year < 2000) { year = parseInt(year) + 1900; }
        var dateString = year + 
                        "-" + helper.pad(monthnumber, 2) + 
                        "-" + helper.pad(monthday, 2) + 
                        "_" + helper.pad(hour, 2) + 
                        "-" + helper.pad(minute, 2) + 
                        "-" + helper.pad(second, 2);
        return dateString;
    },
    dateActual: function() {
        var months = new Array(13);
        months[0] = "January";
        months[1] = "February";
        months[2] = "March";
        months[3] = "April";
        months[4] = "May";
        months[5] = "June";
        months[6] = "July";
        months[7] = "August";
        months[8] = "September";
        months[9] = "October";
        months[10] = "November";
        months[11] = "December";
        var now = new Date();
        var monthnumber = now.getMonth() + 1;
        var monthname = months[monthnumber];
        var monthday = now.getDate();
        var year = now.getYear();
        if (year < 2000) { year = parseInt(year) + 1900; }
        var dateString = helper.pad(monthday, 2) +
                        '.' +
                        helper.pad(monthnumber, 2) +
                        '.' +
                        year;
        return dateString;
    } ,
    timeActual: function() {
        var now = new Date();
        var hour = now.getHours();
        var minute = now.getMinutes();
        var second = now.getSeconds();
        var timeString = helper.pad(hour,2) +
                        ':' +
                        helper.pad(minute,2) +
                        ':' +
                        helper.pad(second, 2);
        return timeString;
    },
	/** prevent page scroll while mouse over a specific area
	    ------------------------------------ */
	preventPageScroll: function(jqElem) {
		jqElem.on('DOMMouseScroll mousewheel', function (ev) {
			var $this = $(this),
				scrollTop = this.scrollTop,
				scrollHeight = this.scrollHeight,
				height = $this.height(),
				delta = (ev.type == 'DOMMouseScroll' ?
					ev.originalEvent.detail * -40 :
					ev.originalEvent.wheelDelta),
				up = delta > 0;

			var prevent = function () {
				ev.stopPropagation();
				ev.preventDefault();
				ev.returnValue = false;
				return false;
			}

			if (!up && -delta > scrollHeight - height - scrollTop) {
				// Scrolling down, but this will take us past the bottom.
				$this.scrollTop(scrollHeight);
				return prevent();
			} else if (up && delta > scrollTop) {
				// Scrolling up, but this will take us past the top.
				$this.scrollTop(0);
				return prevent();
			}
		});
	},
	/** get and set urlparameters 
	    ------------------------------------ */
	urlparam:{
		// get a URL Parameters value by its name from querystring
		get:function(name){
			name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
			var regexS = "[\\?&]" + name + "=([^&#]*)";
			var regex = new RegExp(regexS);
			var results = regex.exec(window.location.search);
			if(results == null){
				return "";
			}
			else{
				return decodeURIComponent(results[1].replace(/\+/g, " "));
			}
		},		
		// add/remove/update a querystring parameter. 
		// Not supplying a value will remove the parameter, 
		// supplying one will add/update the paramter. 
		// If no URL is supplied, it will be grabbed from window.location. 
		set: function(name,value){
			if (!url) url = window.location.href;
			var re = new RegExp("([?|&])" + key + "=.*?(&|#|$)(.*)", "gi");

			if (re.test(url)) {
				if (value)
					return url.replace(re, '$1' + key + "=" + value + '$2$3');
				else {
					return url.replace(re, '$1$3').replace(/(&|\?)$/, '');
				}
			}
			else {
				if (value) {
					var separator = url.indexOf('?') !== -1 ? '&' : '?',
						hash = url.split('#');
					url = hash[0] + separator + key + '=' + value;
					if (hash[1]) url += '#' + hash[1];
					return url;
				}
				else
					return url;
			}
		}

	},
    /** error handling & logging
        ------------------------------------ */
    errorLog: function(err, loglevel, logtype){    
		if (typeof(logtype) == "undefined"){
			logtype="console";
		}
		//logtype="alert";
		switch(logtype){ 
			case 'alert': 
				alert(err);
				break;        
			case 'server': 
				var theParameters = {};
				theParameters.UserID = app.obj.user.UserID;
				theParameters.D = 0;
				theParameters.ObjectTypeID =objTypeID;
				theParameters.ObjectID = objID;
				theParameters.ParentID = 0;                
				theParameters.DateCreated = helper.datetimeDB();
				var params = {v:theParameters};
				helper.dataAPI("setData","log", params ,function(err,data){ 
					if(!err){                                            
						var result = data;
						if (data == "saved"){
							//log saved
						}
						else{
							// error on trying to save loglevel
						}
					}
					else{
						
							// error on trying to save loglevel
					}

				}); 
				break;        
			default:
				//log to console
				console.log(err);
				break;
		}
		
        //helper.errorLog(JSON.stringify(err));   
        //alert(JSON.stringify(err));
    },
	/** PAD -> add leading zeros to numbers
    ------------------------------------ */
    pad: function(number, size) {
        var s = number + "";
        while (s.length < size) s = "0" + s;
        return s;
    }
}
/** base64 encode */
var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}

/** jQuery plugins and extensions */
/** browser-independent ellipsis ... 
    ------------------------------------ */
// Usage Example: 
/**                   attribution to http://stackoverflow.com/questions/536814/insert-ellipsis-into-html-tag-if-content-too-wide
    -----------------------------------------------------------------------------------------------------------------------------
    .ellipsis {
	white-space: nowrap;
	overflow: hidden;
    }

    .ellipsis.multiline {
        white-space: normal;
    }

    <div class="ellipsis" style="width: 100px; border: 1px solid black;">Lorem ipsum dolor sit amet, consectetur adipisicing elit</div>
    <div class="ellipsis multiline" style="width: 100px; height: 40px; border: 1px solid black; margin-bottom: 100px">Lorem ipsum dolor sit amet, consectetur adipisicing elit</div>

    <script type="text/javascript" src="/js/jquery.ellipsis.js"></script>
    <script type="text/javascript">
        $(".ellipsis").ellipsis();
    </script>
*/
$.fn.ellipsis = function () {
    return this.each(function () {
        var el = $(this);

        if (el.css("overflow") == "hidden") {
            var text = el.html();
            var multiline = el.hasClass('multiline');
            var t = $(this.cloneNode(true))
				.hide()
				.css('position', 'absolute')
				.css('overflow', 'visible')
				.width(multiline ? el.width() : 'auto')
				.height(multiline ? 'auto' : el.height())
				;

            el.after(t);

            function height() { return t.height() > el.height(); };
            function width() { return t.width() > el.width(); };

            var func = multiline ? height : width;

            while (text.length > 0 && func()) {
                text = text.substr(0, text.length - 1);
                t.html(text + "...");
            }

            el.html(t.html());
            t.remove();
        }
    });
};

