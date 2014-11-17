
// override the $.getScript() function so that it always creates an external reference rather than inline content.
// this is necesary to debug with firebug ... otherwise only numbered references of the scripts are created which can not be debugged properly
jQuery.extend({
   getScript: function(url, callback) {
      var head = document.getElementsByTagName("head")[0];
      var script = document.createElement("script");
      script.src = url;

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

window.onresize = function(event) {
	//resizeDivs("automatic");
    app.screenChange();
}
// intialize helper and app
$(document).ready(function() {
    helper.initialize();
    app.initialize();
});

/**###################################################
			main app properties & methods
   ################################################### */
var app={
    /** general app parameters
        ------------------------------------ */
	name: 'AppHof',
	user: 'nicht angemeldet',
	pass: '',
	auth: '',
    baseURL: 'http://fair.in-u.at/',
	serviceURL: 'http://fair.in-u.at/DesktopModules/inuFair/API/WS/',
	imageURL: 'http://fair.in-u.at/bbimagehandler.ashx',
    imageUserURL: 'http://fair.in-u.at/profilepic.ashx',
    isApp: false, //deviceready does not fire on normal browsers - so default is false - check done in deviceready
    /** persistent data objects 
        ------------------------------------ */
    obj: {
        user:{
			Name:"nicht angemeldet", 
			ID:0
		},
        categorys:{},
        locations:{},
        getObjItem: function(obj, key, value) {
            for (var i = 0; i < obj.length; i++) {
                if (obj[i][key] == value) {
                    return obj[i];
                }
            }
            return null;
        }
    },    
    
    /** app options, status, eventbinding
        & fetching of persistent data objects
        ------------------------------------ */
	options:{
        retryTimeOut:   500,
		language: 		'de',
        gpsTimeout:     5000 // timeout for trying to get GPS coordinates on gps check
	},
    status: {
        screenHeight: 100,
        screenWidth: 100,
        online: false,
        geoinfo: false,
        lat: "48.20857355", // latitude Stephansdom
        lon: "16.37254714" // longitude Stephansdom
    },
	initialize: function () {
        $("#pageTitle").text($(".page.active").attr("pghead"));
		console.log("initialized...");
		// USER / PASS INCORRECT 
        /*if (app.data.get("appHof_U") != "err"){
			var un =app.data.get("appHof_U");
            app.user = un;
			$("#loginUser").val(un);
            app.obj.user.Name= un;
            var pw = app.data.get("appHof_P");
			app.pass = pw;
			$("#loginPass").val(pw);
            app.obj.user.ID=app.data.get("appHof_UI");			
        }
		else*/ if (testuser != ""){
            app.user=testuser;
            app.pass=testpass;
            app.obj.user.Name=testuser;
            app.obj.user.ID=testuserid;
        }
        
        // init screen diminsions for overlays
        app.status.screenHeight=$(window).height() - 50;
        app.status.screenWidth=$(window).width();
        app.auth = Base64.encode(app.user + ":" + app.pass);
        
        // init helper functions
        //helper.initialize();
        
		//bind handler for menu items click functions
        this.bind();
        
        // Allow Cross domain requests per ajax!
		$.support.cors = true;
                
        // get persistent data objects for later use
        app.dataAPI("getData","categorys",{},function(err,data){
            if(!err){
                app.obj.categorys = data;
            }
            else{
                app.errorLog(err);
            }
        });                
        app.dataAPI("getData","locations", {},function(err,data){
            if(!err){
                app.obj.locations = data;
            }
            else{
                app.errorLog(err);
            }
        });     
        
        //get the data for admin functions if applicable
        app.dataAPI("getData","adminpage", {},function(err,data){ 
            if(!err){
				$("#admin-page").empty();
                $("#admin-page").append(data);
				$("#menu-admin").removeClass("hidden");
            }
        });
		
		//get the data for seller functions if applicable
		app.dataAPI("getData","sellerpage", {},function(err,data){ 
            if(!err){
                $("#seller-page").empty();
                $("#seller-page").append(data);
				$("#menu-seller").removeClass("hidden");
            }
        });
		
		// load actual tipps
		app.tipp.list("tippsList","box");
		
		// init the map screen
        app.map.init();
        
        $("#userImage").attr("src", app.imageUserURL + "?userId=" + app.obj.user.ID + "&h=64&w=64");
	},
    // MENU clicks and header button clicks binding
	bind: function () {
		console.log("bind...");
        // add deviceready event to bind the hardwarekeys (back, menu) to the proper functions
		document.addEventListener('deviceready', this.deviceready, false);
        
        // bind menu buttons click handler
        $("#btn-menu").click(function(){ 
			app.menu.toggle();
        });
		
		$("#exitBtn").click(function(){
			app.exit();
			app.menu.close();
        });
		
		// bind menu items & header Buttons click handler
		$(".btn-pg").click(function(){
			app.menu.close();
            app.page.show($(this).attr("rel"));
        });
        
		$("#menuCloseTop").click(function(){
			app.menu.close();
        });
		
		// bind search input keyup & button
		$("#searchMain").keyup(function(e) {
			var code = e.keyCode || e.which;
			if(code == 13) { //Enter pressed - search now
			   app.search.result($("#searchMain").val());
			}
			else{
				app.search.suggest($("#searchMain").val());
			}
		});
		$("#searchNow").click(function() {
			app.search.result($("#searchMain").val());
		});
	},
	deviceready: function () {
		// note that this is an event handler so the scope is that of the event ( which happens outside of "app" in "window" )
		// so we need to call e.g. app.menuKeyDown(), and not this.menuKeyDown()
		console.log('device ready...');
		// bind menu and back buttons ... (in the App)
		document.addEventListener("menubutton", app.menuKeyDown, true);
		document.addEventListener("backbutton", app.backKeyDown, false);
        
        //check internet connection
        if (navigator.online) {
            // check if server is reachable
            app.status.online=true;            
        }
        else{
            // ???
            app.status.online=false;
        }
        
        // check if geolocation is available
        if (navigator.geolocation) {
            var timeoutVal = app.options.gpsTimeout;
            navigator.geolocation.getCurrentPosition(
                function(position){
                    // success
                    app.status.lat = position.coords.latitude;
                    app.status.lon = position.coords.longitude;
                    //window.gpsAcc = position.coords.accuracy;
                    app.status.geoinfo = true;
                },
                function(){
                    // error
                    app.status.geoinfo = false;                    
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
            app.status.geoinfo = false;
        }
		
		// check if running in browser or on phoneApp
		if ( helper.isMobileApp() ) {
			//alert("Running on Mobileapp!");
			app.isApp = true;
			$("body").addClass("mobileApp");
		} else {
			// maybe this does not ever fire - but keep it for future browsers...
			//alert("Running NOT on PhoneGap!");
			app.isApp = false;
			$("body").removeClass("mobileApp");
		}
	},
    //remove mobileinit if only for jQ mobile because jQmobile is not used here #############################################################
    mobileinit: function () {
        
        // only for jQuery mobile ???
		console.log("mobile init ...");
		// Allow Cross domain requests per ajax also for the mobile device!
		$.mobile.allowCrossDomainPages = true;		
	},
    /** page and menu functions
        ------------------------------------ */
    // common page and menu functions
	screenChange:function(){        
        app.status.screenHeight=$(window).height() - 50;
        app.status.screenWidth=$(window).width();
        	
        if (map){
           app.map.refresh();
        }
        
    },
    page: {
        show: function(pageName){
            var pageTitle = $(".page[rel=" + pageName + "]").attr("pghead");
            // set all pages to inactive
            $(".page").removeClass("active");
            $(".btn-pg").removeClass("active");
            // set selected page to active
            $(".page[rel=" + pageName + "]").addClass("active");
            $(".btn-pg[rel=" + pageName + "]").addClass("active");
            // set page title to selected page´s pghead tag
            app.page.setTitle(pageTitle);
            // hack for the map to show up correctly, because hidden map will not updae properly
            if(pageName == "map"){
                if (map){
                    map.invalidateSize(false);
                }
            }
            //close all menus which are open to show whole content afer menu click
            $(".menu-main.open").removeClass("open");   
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
		else if ( $("popup").hasclass("open") ){
			helper.popup.close();
		}
		else if ( $(".page.active").attr("rel") == "start" && helper.isMobileApp ){
			app.exit();
		}
		
	},
	exit: function(){
		// ask if to exit if app - sure ?
		//helper.popup.show(title, content, iconname, ok, cancel,callbackOk,callbackCancel){
		helper.popup.show(  "App beenden" ,                                        // overlay title
						"<p>Sind Sie sicher, dass Sie die App beenden möchten ?<p>",     // overlay textarea
						'',                                        				// image for title row (auto resized to 20x20 px)
						true,                                                  	// show OK button?
						false,                                                  // show CANCEL button?
						function(){												// callback function to bind to the OK button
							navigator.app.exitApp();
						},                       
						function(){helper.popup.close();} ,"ok","abbrechen"                   // callback function to bind to the CANCEL button
					);
	},
    // search functions
	search:{
		suggest: function(searchstring){
			//get the data and handle callback
                app.dataAPI("getSuggest","no", {'n': 10, 's': searchstring},function(err,data){ 
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
							suggestions +=		"<i class='et et-" + icon + " btn-icon'></i>";	
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
                        app.errorLog(err);
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
        init: function(){
            // init Map - workaround for map size bug
            $('#map').height($(document).height());
            $('#map').width($(document).width());

            //initialize the map page
            tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }), latlng = new L.LatLng(parseFloat(app.status.lat), parseFloat(app.status.lon));

            map = L.map('map', {center: latlng, zoom: 9, layers: [tiles]});
            app.map.markersSet();

        },
        refresh: function(){
            console.log("Refreshing Map");
            map.invalidateSize(false);
        },
        markersSet:function(){
            var markers = new L.markerClusterGroup();    
            //var markers = l.Marker();
            if (typeof(app.obj.locations) !== "undefined" && typeof(app.obj.locations.length) !== "undefined" && app.obj.locations.length != 0 ){
                console.log("Adding Markers");
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
                 }, app.options.retryTimeOut);
            }
        },
		marker:{
			// click on marker - show the details
			click: function(locID){
				app.location.details.show(locID);
			}
		},
    },
    // location functions
    location:  {
        details:{
            // slideUp Location Details for a specified locationID
			show:function(locID){
				app.dataAPI("getData","locationdetails", {'i': locID},function(err,dataObj){
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
							markup += "<i class='et et-phone'></i></td>"
							markup += "<td>&nbsp;<a href='tel:" + data.Phone.replace(/\s+/g, '') + "'>";
							markup += data.Phone + "</a>";
							markup += "</td></tr>";
						}
						if(data.Cell && data.Cell != ""){                  
							markup += "<tr><td>";
							markup += "<i class='et et-mobile'></i></td>"
							markup += "<td>&nbsp;<a href='tel:" + data.Cell.replace(/\s+/g, '');
							markup += "'>" + data.Cell + "</a>";
							markup += "</td></tr>";
						}                    
						if(data.Mail && data.Mail != ""){                  
							markup += "<tr><td>";
							markup += "<i class='et et-mail'></i></td>"
							markup += "<td>&nbsp;<a href='mailto:" + data.Mail.replace(/\s+/g, '');
							markup += "'>" + data.Mail + "</a>";
							markup += "</td></tr>";
						}
						if(data.Web && data.Web != ""){                  
							markup += "<tr><td>";
							markup += "<i class='et et-globe'></i></td>"
							markup += "<td>&nbsp;<a href='http://" + data.Web.replace(/\s+/g, '');
							markup += "' target='_blank'>" + data.Web ;
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

							markup += "<div><img style='border: 1px solid #eee;' src='" + app.imageURL + "?Url=" + webshort + "&width=200&ratio=screen' />" + "</a>"; 
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
								var catInfo = app.obj.getObjItem(app.obj.categorys,"ID",catID);
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
						if (app.obj.user.ID == 0){
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
						app.errorLog(err);
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
                app.dataAPI("getData","tipps", {'i': itemID, 'o':objecttypeID},function(err,dataset){
                   if(!err){
                        var markup = "";
						
						$.each(dataset,function(){
							var data = this;                  
							markup += "<li id='tippElem" + data.ID + "' class='tipps'>"; 
							markup += "	  <div class='tippsImage lazy' rel='" + data.ImageID + "'>";
							markup += "	  </div>";
							markup += "   <div class='tippsInner table'>";
							markup += "     <span class='tipps row1 tr'>";      
							markup += "       <span class='tipps td vertical-middle align-left'>";   
							markup += "         <span class='createdDate tippsTop'>" + data.DateCreated + "</span>&nbsp;";        
							markup += "         <span class='trashBtn btn-icon float-right vertical-middle align-center' rel='" + data.ID + "'><i class='et et-trash'></i></span>"; 
							markup += "         <span class='optionsBtn btn-icon float-right vertical-middle align-center' rel='" + data.ID + "'><i class='et et-three-dots'></i></span>";
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
							app.image.update(theWrapperID);
							// update optionbuttons click handler
							var selector = $("#" + wrapperID + " span.optionsBtn");
							$.each(selector, function(){
								var sel = $(this);
								sel.unbind('click');
								sel.click(function(){
									app.tipp.options.popUp(sel.attr("rel"));
								});
							});
							
							selector = $("#" + wrapperID + " span.trashBtn");
							$.each(selector, function(){
								var sel = $(this);
								sel.unbind('click');
								sel.click(function(){
									var elemToHide = sel.closest("li.tipps");
									app.tipp.trash(sel.attr("rel"),elemToHide);
								});
							});
						},500);
						
                    }
                    else{
                        app.errorLog(err);
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
				if (app.isApp){
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
					markup += "      <i id='tippShareXI' class='btn et et-flash'></i><br>";				
					markup += "      <i id='tippShareLI' class='btn ets ets-linkedin'></i>";
					markup += "    </span>";
				}
				markup += "  </div>";
				markup += "</div>";
				
				helper.popup.show('Optionen',                                      
									markup,     
									'et et-docs',
									false,
									true,
									function(){ 
										// callback from OK button (hidden)									
									},                       
									function(){ // callback from CANCEL button
										// hide the overlay                
										helper.popup.hide();
									}                    
				);
				app.tipp.options.bind(tippID);
			},
			bind:function(tippID){
				// bind functions to the options
				if( $("#tippOptions").length > 0 ){
					// its already there - get data for the tipp
					
					// find the elements and bind functions to the options
					var tippDetails = $("#tippOptions .tippDetails");
					tippDetails.unbind('click');
					tippDetails.click(function(){
						app.tipp.details(tippID);
					});
					var tippMap = $("#tippOptions .tippMap");
					tippMap.unbind('click');
					tippMap.click(function(){
					
						app.map.location.show(locationID);
						
					});
					var tippFavourite = $("#tippOptions .tippFavourite");
					tippFavourite.unbind('click');
					tippFavourite.click(function(){
						app.fav.add(tippID);
					});
					if( $("#tippOptions .tippShare").length > 0 ){
						var tippShare = $("#tippOptions .tippShare");
						tippShare.unbind('click');
						tippShare.click(function(){
							app.share("TestMessage", "TestSubject" ,"http://in-u.at/Portals/0/inuLogoWEB.png", "http://in-u.at");
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
						
						$("#tippShareTW").click(function(){
							window.open("https://twitter.com/intent/tweet?text=TITLE&url=http://in-u.at&via=TWITTER-HANDLE",'_blank');
						});
						$("#tippShareFB").click(function(){
							window.open("http://www.facebook.com/sharer/sharer.php?u=http://in-u.at",'_blank');
						});			
						$("#tippShareGP").click(function(){
							window.open("https://plus.google.com/share?url=http://in-u.at",'_blank');
						});
						$("#tippSharePI").click(function(){
							window.open("http://pinterest.com/pin/create/button/?url=http://in-u.at&description=YOUR-DESCRIPTION&media=YOUR-IMAGE-SRC",'_blank');
						});
						$("#tippShareXI").click(function(){
							window.open("https://www.xing-share.com/app/user?op=share;sc_p=xing-share;url=http://in-u.at",'_blank');
						});
						$("#tippShareLI").click(function(){
							window.open("http://www.linkedin.com/shareArticle?mini=true&url=http://in-u.at&title=YOUR-TITLE&summary=YOUR-SUMMARY&source=http://in-u.at",'_blank');
						});
					}
				}
				else{
					var theTippID = tippID;
					// delay this function
					setTimeout(function(){
						app.tipp.options.bind(theTippID);
					},app.options.retryTimeOut);
				}
			}
		},
		details:function(tippID){
			app.location.details.slideUp(locID);
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
                app.dataAPI("getData","uservotings-c", {'i': itemID, 'o':objecttypeID},function(err,dataset){ 
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
                                markup += "<i class='et et-star orange'></i>";
                                count++;
                            }
                            var votingDecimal= (voting -votingFull) *100;
                            if (Math.floor(votingDecimal) >= 50){
                                markup += "<i class='et-et-star orange'></i>";
                                count++
                            }
                            for (var i = count; i < 5; i++) {
                                markup += "<i class='et et-star-empty lightgray'></i>";
                            }
                            markup += "&nbsp;<span class='votingcount'> aus " + data.VotingCount + " Votings</span>";
                        }  
                        markup += "</span>";
                        $("#" + wrapperID ).html(markup);
                    }
                    else{
                        app.errorLog(err);
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
            var markup = helper.form(theFields);
            helper.popup.show('Kommentar',                                      
                                markup,     
                                'no_avatar.gif',
                                true,
                                true,
                                function(){ // callback from OK button
                                    // save                                     
                                    var theParameters = {};
                                    theParameters.UserID = app.obj.user.ID;
                                    theParameters.StatusID = 0;
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
                                    app.dataAPI("setData","comment", params ,function(err,data){ 
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
                                            app.errorLog(err);
                                            helper.info.add("error","Es ist ein Fehler aufgetreten:<hr/><p>" + JSON.stringify(data) + 
                                                            "</p><hr/>Bitte informieren Sie den Administrator",true);
                                            helper.popup.hide();
                                        }

                                    }); 
                                },                       
                                function(){ // callback from CANCEL button
                                    // clear and discard - just hide the overlay                
                                    helper.popup.hide();
                                }                    
            );
        },
        markup:{
            get: function(wrapperID, objecttypeID, itemID){
                //get the data and handle callback
                app.dataAPI("getData","usercomments", {'i': itemID, 'o':objecttypeID},function(err,dataset){
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
                                    votingMarkup += "<i class='et et-star orange'></i>";
                                    count++;
                                }
                                var votingDecimal= (voting -votingFull) *100;
                                if (Math.floor(votingDecimal) >= 50){
                                    votingMarkup += "<i class='et et-star orange'></i>";
                                    count++
                                }
                                for (var i = count; i < 5; i++) {
                                    votingMarkup += "<i class='et et-star-empty lightgray'></i>";
                                }
                            }
                            markup += "     </span>";  
                            markup += "</li>";  
                            markup += "<li class='comments'>";      
                            markup += "     <span class='comments col1'>";   
                            markup += "         <span class='createdDate'>" + data.DateCreated + "</span><br/>";                                
                            markup += "         <img class='profileSmall' src='" + app.imageUserURL + "?userId=" + data.UserID + "&h=64&w=64'/><br/>";    
                            markup += "         <span class='profileName'>" + data.DisplayName + "</span>";                 
                            markup += "     </span>";       
                            markup += "     <span class='comments col2'>";                 
                            markup += data.Comment;       
                            markup += "     </span>";          
                            markup += "     <span class='comments col3'>";              
                            markup += votingMarkup;       
                            markup += "     </span>";                      
                            markup += "</li>";
                        });
                        markup += "</ul></div>";                        
                        $("#" + wrapperID ).html(markup);
                        // change order to "newest on top"
                        helper.reverseLi($("#" + wrapperID + " ul:first"));
                    }
                    else{
                        app.errorLog(err);
                    }
                });
            },
            getSum: function(wrapperID, objecttypeID, itemID){
                //get the data and handle callback
                var markup = "";
                app.dataAPI("getData","usercomments-c", {'i': itemID, 'o':objecttypeID},function(err,dataset){ 
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
                        app.errorLog(err);
                    }
                        $("#" + wrapperID ).html(markup);
                });        
            }
        }
	},
    // image lazy update
    image:{
        //  update all images or backgrounds with the class "lazy" within a wrapper  ############################################################ NEW - SERVERSIDE TODO
        /** ---------------------------------------------------------------------
            first generate markup 
                <div id="wrapperID"><img class='lazy' rel='1' src='' width='150'/>...</div>
            rel should hold the image-id from the db 
            after inserting the generated markup in the DOM call: 
                                                                app.imageupdate("wrapperID");
        */
        update: function(wrapperID){
            // iterate over the images in the wrapper
			var theSelector = $("#" + wrapperID + " .lazy");
            $.each(theSelector, function(){
                var theImage = $(this);
                var imageID = theImage.attr("rel");
                // get imagedetails and build handlerURL and relevant tags
                app.dataAPI("getData","images", {'i': imageID},function(err,imgObjs){
                    var imageToChange = theImage;   
                    if(!err){
						var imgObj = imgObjs[0];
						var theURL = app.imageURL + "?File=IMG/" + imgObj.FilePath
									+ "/" + imgObj.FileName + "." + imgObj.FileType ;
									
						if ( imageToChange.is("img")){
							// change image parameters
							theURL = theURL +  "&width=" + imageToChange[0].width;
							imageToChange.attr("src",theURL);
							imageToChange.attr("title", imgObj.Title);
							imageToChange.attr("alt", imgObj.Alt);
						}
						else{
							// change background of element
							imageToChange.css({'background': 'url(' + theURL + ') no-repeat','background-size': '100% auto', 'background-position':'center center'});
						}
                    }
                    else{
                        app.errorLog(err);
                    }
                });
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
			console.log("sharing pressed");
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
	/** data api (ajaxPOST)
    ------------------------------------------- */
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
    data:{
		get: function(key){
			if(typeof(Storage) !== "undefined") {
				return localStorage.getItem(key);				
			} else {
				// Sorry! No Web Storage support..
				return "err";
			}
		},
		set: function(key,val){
			if(typeof(Storage) !== "undefined") {
				localStorage.setItem(key, val);
				return "ok";
			} else {
				// Sorry! No Web Storage support..
				return "err";
			}		
		}
	},
    /** error handling & logging
        ------------------------------------ */
    errorLog: function(err){        
        console.log(JSON.stringify(err));   
        //alert(JSON.stringify(err));
    }
};


/**###################################################
				Helper Functions
###################################################### */
var helper = {
    /** initialization and event binding
    ------------------------------------ */
    initialize: function(){
        $("#overlayHideBtn").click(function(){
            helper.popup.hide();
        });
    },
    isMobileApp: function(){
		return (window.cordova || window.PhoneGap || window.phonegap)
		&& /^file:\/{3}[^\/]/i.test(window.location.href)
		&& /ios|iphone|ipod|ipad|android/i.test(navigator.userAgent);
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
                            okBtn.unbind('click');
                            okBtn.click(function(){
                                callbackOk();
                            });
                        }
                        else{
                            // bind close function
                            okBtn.unbind('click');
                            okBtn.click(function(){
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
                    if(cancel == true){		okBtn.find(".btn-text").text("speichern");
						if (typeof(okText) != "undefined"){ 
							cancelBtn.find(".btn-text").text(cancelText);
						}
                        cancelBtn.show();
                        if (typeof(callbackCancel) != "undefined"){ 
                            cancelBtn.unbind('click');                        
                            cancelBtn.click(function(){
                                callbackCancel();
                            });
                        }
                        else{
                            // bind close function
                            cancelBtn.unbind('click');                        
                            cancelBtn.click(function(){
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
            $('#mask').css({ 'width': app.status.screenWidth, 'height': app.status.screenHeight + 50 });

            
            theOverlay.show();

            //Get the window height and width
            var winH = theOverlay.outerHeight();
            var winW = theOverlay.outerWidth();
            var topPos = (app.status.screenHeight - winH) / 2;
            if (topPos < 10) {
                topPos = 10;
            }
            var leftPos = (app.status.screenWidth - winW) / 2;
            if (leftPos < 10) {
                leftPos = 10;
            }
            theOverlay.css({'top': topPos + 'px','margin-left': leftPos + 'px','margin-right': leftPos + 'px'});
			theOverlay.addClass("open");
        },
        hide: function(){	
            var theOverlay = $("#popup");
            //$("#mask").fadeOut(500);
			$('#mask').removeClass("visible");
            theOverlay.hide();	
			
			theOverlay.removeClass("open");
        }
    },    
    spinner:{
        queue: 0,
        timeout: 5000,
        show: function(showModal,autohide){
            helper.spinner.queue = helper.spinner.queue + 1;
            var topPos = (app.status.screenHeight - 140) / 2;
            if (topPos < 10) {
                topPos = 10;
            }
            var leftPos = (app.status.screenWidth - 220) / 2;
            if (leftPos < 10) {
                leftPos = 10;
            }
            $("#spinner").css({'top': topPos + 'px','margin-left': leftPos + 'px','margin-right': leftPos + 'px'});
            if( typeof(showModal) != "undefined" && showModal == true){                
                $("#spinnermask").show();
                $("#spinner").show();
            }
            else{
                $("#spinner").show();
            }
            if( typeof(autohide) != "undefined" && autohide == true){                
                setTimeout(helper.spinner.hide,helper.spinner.timeout);
            }            
        },
        hide: function(){
            helper.spinner.queue = helper.spinner.queue - 1;
            if (helper.spinner.queue <= 0){
                helper.spinner.queue = 0;
                $("#spinnermask").hide();                
                $("#spinner").hide();
            }
        }
    },
    info:{
        lastID:0,
        timeout: 3000,
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
            markup += "<span class='popup-close' onclick='$(this).parent().remove();'>x</span>";
            markup += iconTmp + infotext + "</span>";
            
            if( typeof(autohide) != "undefined" && autohide == true){                
                setTimeout(function(){
                    var theID = helper.info.lastID;
                    helper.info.hide(theID);
                },helper.info.timeout);
            }
            $("#info").append(markup);            
        },
        hide: function(id){
            $("span.infoelement[rel=" + id + "]").remove();
        }
    },
    form: function(fields){
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
    /** GUI & Controls 
    ------------------------------------ */    
    //* select an option by Text or Value 
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
     /** PAD -> add leading zeros to numbers
    ------------------------------------ */
    pad: function(number, size) {
        var s = number + "";
        while (s.length < size) s = "0" + s;
        return s;
    }
}
/**###################################################
						base64 encode
###################################################### */
var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}

/**###################################################
            jQuery plugins and extensions
###################################################### */
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

