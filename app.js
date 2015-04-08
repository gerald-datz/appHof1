
// override the $.getScript() function so that it always creates an external reference rather than inline content.
// this is necesary to debug with firebug ... otherwise only numbered references of the scripts are created which can not be debugged properly
jQuery.extend({
   getScript: function(url, callback) {
      var head = document.getElementsByTagName("head")[0];
      var script = document.createElement("script");
      script.src = url + "?" + helper.datetime.actual.time();

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
var hasSwiped = false;
// initialize map and set user position marker and define click function
var map;
var tiles;
var minimap;
var minitiles;
var detailmap;
var detailtiles;
var markersGroup;
var layerPoly;
var circle;
// updateable user-Marker on Map
var meMarkerIcon;
var minimeMarkerIcon;
var mePosMarker;
var minimePosMarker;
var layerNotNear;
var markerNotNear;

window.onresize = function(event) {
	//resizeDivs("automatic");
    app.screenChange();
}

// intialize helper and app
$(document).ready(function() {
	helper.errorLog("document ready ...");
	helper.initialize();
});

/**###################################################
					main app properties
						& methods
   ################################################### */
var app={
    /** general app parameters ------------------------------------ */
	name: 'AppHof',
	user: '',
	auth: 'anonymous',
	authstate: false,
    baseURL: 'http://apphof.at/',
	serviceURL: 'http://apphof.at/DesktopModules/inuFair/API/WS/',
	blogURL: 'http://apphof.at/DesktopModules/DNNInfo_Classifieds/ClassifiedImages/',
	imageURL: 'http://apphof.at/bbimagehandler.ashx',
    imageUserURL: 'http://apphof.at/profilepic.ashx?portalid=0',
	profileURL: 'http://apphof.at/Profil/ctl/Profile/userId/', 
	viewMode: '',
	debug: true,
	version:"0.0.0",
	deviceModel:"",
	osName:"",
	osVersion:"",
	/** persistent data objects ----------------------------------------------- */
    obj: {
        user:{},
        categorys:{},
        locations:{},
		tipps:{}
    },
    authenticated:function(){
		if (app.auth != "" && app.auth != "anonymous" && app.authstate == true){
			$("body").addClass("authOK");
			$(".auth").prop('disabled',false);
		}
		else{
			$("body").removeClass("authOK");
			//$(".auth").find('*').prop("disabled", true);	
			$(".auth").prop('disabled',true);
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
		else if ( $(".page.active:first").attr("rel") == "start" && helper.appIsMobile == true ){
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
		//prevent exiting the app only ba pressing back key
		return false;
	},
	bind:function(){		
		helper.errorLog("app bind...");                
        // bind menu buttons click handler
        $("#btn-menu").off("click");
        $("#btn-menu").on("click",function(){ 
			app.menu.toggle();
        });
		/* To early for binding?
		$("#exitBtn").off("click");
		$("#exitBtn").on("click",function(){
			navigator.app.exitApp();
			
			app.menu.close();
			app.exit();
			
        });
		*/
		// bind menu items & header Buttons click handler
		$(".btn-pg").off("click");
		$(".btn-pg").on("click",function(){
			if( $(this).hasClass("auth") && app.authstate == false){
				//only for auth users
			}
			else{
				app.menu.close();
				app.page.show($(this).attr("rel"));
			}
        });
        
		$("#menu-close").off("click");
		$("#menu-close").on("click",function(){
			app.menu.close();
        });
		
		// login  buttons
		$("#menu-login").off("click");
		$("#menu-login").on("click",function(){
			app.login.handler(true);
		});
		
		// register buttons
		$("#menu-register").off("click");
		$("#menu-register").on("click",function(){
			app.page.show("register");
			app.menu.close();
        });
		
		// register now button in register page
		$("#registerNow").off("click");
		$("#registerNow").on("click",function(){
			app.login.register();
        });
		
		// logout buttons		
		$("#menu-logout").off("click");
		$("#menu-logout").on("click",function(){
			app.logout();
        });
		
		//search functions
		$("#searchMain").unbind('keyup').keyup(function(e) {
			var code = e.keyCode || e.which;
			if(code == 13) { //Enter pressed - search now
			   //app.search.result($("#searchMain").val());
			   app.search.now($("#searchMain").val());
			}
			else{
				app.search.now($("#searchMain").val());
			}
		});
		$("#chkSearchNear").off("click");
		$("#chkSearchNear").on("click",function(){
			app.search.now($("#searchMain").val());
        });
		
		$("#settings-user-image").off("click");
		$("#settings-user-image").on("click",function(){
			if (typeof(app.obj.user.UserID) != "undefined" && app.obj.user.UserID != 0){
				window.open(app.profileURL + app.obj.user.UserID + "/pageno/2","_system");
			}			
        });
		$("#settings-user-profile").off("click");
		$("#settings-user-profile").on("click",function(){
			if (typeof(app.obj.user.UserID) != "undefined" && app.obj.user.UserID != 0){
				window.open(app.profileURL + app.obj.user.UserID + "/pageno/1","_system");
			}			
        });		
	},
	// comments functions
	comment:{
        add: function(objTypeID, objID){
			if(app.authstate==true){
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
						Control: "stars",
						Options: {
							1:{
							Text: "",
							Value: "1"
							},
							2:{
							Text: "",
							Value: "2"
							},
							3:{
							Text: "",
							Value: "3"
							},
							4:{
							Text: "",
							Value: "4"
							},
							5:{
							Text: "",
							Value: "5"
							}
						}
					},
					3:{
						Name:   "DataStatus",
						Label:  "Datenqualität:",
						Control: "checkicons",
						Options: {
							Text: "",
							Value: "1"
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
										theParameters.DateCreated = helper.datetime.actual.datetimeDB();
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
			}
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
                                votingMarkup += "<span class='votingsum'><span class='votingtext'>Wertung:</span>&nbsp;&nbsp;";
                                for (var i = 0; i < votingFull; i++) {
                                    votingMarkup += "<i class='fa fa-fw fa-star orange'></i>";
                                    count++;
                                }
                                var votingDecimal= (voting -votingFull) *100;
                                if (Math.floor(votingDecimal) >= 50){
                                    votingMarkup += "<i class='fa fa-fw fa-star-half-o orange'></i>";
                                    count++
                                }
                                for (var i = count; i < 5; i++) {
                                    votingMarkup += "<i class='fa fa-fw fa-star-o lightgray'></i>";
                                }
                                votingMarkup += "</span>";								
                            }
							var qualityMarkup = "<span class='qualityinfo float-right'>";
							if (isNaN(data.DataStatus) || data.DataStatus <= 0 ){
                                // no number - no quality statement
							}
                            else if (data.DataStatus == 1){
								qualityMarkup += "<span class='votingtext'>Aktualität:</span>&nbsp;&nbsp;<i class='fa fa-check-circle green'></i>";
                            }
                            else if (data.DataStatus == 2){
								qualityMarkup += "<span class='votingtext'>Aktualität:</span>&nbsp;&nbsp;<i class='fa fa-warning red'></i>";
                            }
							qualityMarkup += "</span>";
                            markup += "     </span>";  
                            markup += "</li>";  
                            markup += "<li class='comments'>";      
                            markup += "     <span class='comments col1'>";
                            markup += "         <span class='createdDate'>" + helper.datetime.fromDate.datetimeShort( data.DateCreated ) + "</span>";                   
                            markup += "         <img class='profileSmall' src='" + app.imageUserURL + "&userId=" + data.UserID +  "&h=64&w=64&time=" + helper.datetime.actual.time() + "'/><br/>";
                            markup += "         <span class='profileName'>" + data.DisplayName + "</span>";    
                            markup += "     </span>";       
                            markup += "     <span class='comments col2'>";                  
                            markup += votingMarkup + qualityMarkup +"<br><br>";                
                            markup += data.Comment;       
                            markup += "     </span>";          
                            markup += "</li>";
                        });
                        markup += "</ul></div>";                        
                        $("#" + wrapperID ).html(markup);
                        // change order to "newest on top"
                        helper.control.ul.reverse($("#" + wrapperID + " ul:first"));
                    }
                    else{
                        helper.errorLog(err);
                    }
                });
            },
            getSum: function(wrapperID, objecttypeID, itemID, small, valueCommentSum){
                //get the data and handle callback
                var markup = "";
				if(typeof(valueCommentSum) != "undefined" ){
					try {
						valueCommentSum = parseInt(valueCommentSum);
					} 
					catch (e) {
						valueCommentSum = 0;
					} 
					// value is provided, no need to get data online					
					markup += "<span class='commentcount'";
					if (typeof(small) != "undefined" && small == true){
						markup += " class='small votingcount'><i class='fa fa-comments blue'></i>&nbsp;( " + valueCommentSum + " )</span>";
					}
					else{
						markup += " class='votingcount'>" + valueCommentSum + "</span>";
					}
					if( typeof(wrapperID) == "undefined" || wrapperID == ""){
						return markup;
					}
					else{
						$("#" + wrapperID ).html(markup);
					}
				}
				else{
					helper.dataAPI("getData","usercomments-c", {'i': itemID, 'o':objecttypeID},function(err,dataset){ 
						if(!err){
							var data = dataset[0];
							var count = data.CommentCount;
							if (isNaN(data.CommentCount) ){
								count = "0";
							}
							markup += "<span class='commentcount'";
							if (typeof(small) != "undefined" && small == true){
								markup += " class='small votingcount'><i class='fa fa-comments blue'></i>&nbsp;( " + count + " )</span>";
							}
							else{
								markup += " class='votingcount'>" + count + "</span>";
							}
						}
						else{
							helper.errorLog(err);
							markup += "<span class='commentcount'>0</span>";
						}
						if( typeof(wrapperID) == "undefined" || wrapperID == ""){
							return markup;
						}
						else{
							$("#" + wrapperID ).html(markup);
						}
					});  
				}
            }
        }
	},
	exit: function(){
		navigator.app.exitApp();
	},
    fav:{
		update: function(){
			$("#favlist").empty();
			var markup = "";
			// get the favs from localstorage 
			var theFavs = JSON.parse(helper.settings.get("Favs"));	
			
			if ( theFavs != null && theFavs != {} && theFavs != ""  && theFavs != " "){
				$.each(theFavs, function(key, value){
					var favParams = key.split("_");
					var favType = favParams[0];
					var favID = favParams[1];	
					var favData = value.split("|");
					var headline = favData[0];
					var text = favData[1];
					var tipptype = favData[2];
					
					// select all favBtn which are e.g. from Type 'tipp' and have rel = ID
					var jqElem = $(".favBtn[datatype='" + favType + "'][rel='" + favID + "']");
					jqElem.addClass("red");
					// add it to the fav page list	var item = this;
							var icon = "";
							var icontext = "";
							var onclick="";
							switch(favType){
								case 'location': 
									if (tipptype == 1){
										icon = 		" location-icon flaticon-home82 blue ";
										icontext =  "<div class='small blue'>AB HOF</div>";
										onclick = 	"app.location.details.show(" + favID + ")";
									}
									else if (tipptype == 2){
										icon = 		" location-icon flaticon-entertaining3 orange ";
										icontext =  "<div class='small orange'>MARKT</div>"; 
									}
									else if (tipptype == 3){
										icon = 		" location-icon flaticon-person92 darkgray ";
										icontext =  "<div class='small green'>AKTIVITÄT</div>";
									}
									else{
										icon = " fa fa-question "
										icontext = "<div class='small lightgray'>SONSTIGE</div>";
									}
									onclick = 	"app.location.details.show(" + favID + ");";
									break;        
								case 'tipp': 
									if (tipptype == "TIPP"){
										icon = 		" fa fa-thumb-tack ";
										icontext =  "<div class='small lightgray'>TIPP</div>";
									}
									else if (tipptype == "BLOG"){
										icon = 		" fa fa-newspaper-o ";
										icontext =  "<div class='small lightgray'>ARTIKEL</div>"; 
									}
									else{
										icon = " fa fa-info "
										icontext = "<div class='small lightgray'>INFO</div>";
									}
									onclick = 	"app.tipp.details(" + favID + ",&quot;" + tipptype + "&quot;);";
									break;        	
								default:
									icon = 		"";
									icontext = "";
									onclick = 	"";
									break;
							}
							if(text == "undefined"){
								text = ""
							}
							
							markup += app.markup.get("favitem",{
									onclick:onclick,
									icon:icon,
									icontext:icontext,
									headline:headline,
									text:text,
									favtype:favType,
									favid:favID,
									tipptype:tipptype
								});
							
							
				});
				$("#favlist").append(markup);
				setTimeout(function(){
					var theFavBtn = $("#favlist .favBtn");
					theFavBtn.off("click");
					theFavBtn.on("click",function(){			
						var theBtn = $(this);
						helper.popup.show("Entfernen bestätigen", "Diesen Favoriteneintrag wirklich entfernen ?", "warning", true, true,
						function(){
							app.fav.remove(theBtn);
							helper.popup.hide();
						},
						function(){
							helper.popup.hide();
						},"   JA   ","  NEIN  ",false,false);
					});
				},500);
			}
		},
		remove: function(jqElem){
			var theID = jqElem.attr("id");
			var theSplitted = theID.split("_");
			var favType = theSplitted[1];
			var favID = theSplitted[2];
			app.fav.toggle(jqElem.find("i:first"),favType,favID,"","","");
			jqElem.closest("li").remove();
		},
		toggle: function(jqElem, dataType, dataID, dataTitle, dataText, tipptype){
			if(app.authstate==true){
				if(typeof(dataText) == "undefined"){
					dataText = "";
				}
				if(typeof(tipptype) == "undefined"){
					tipptype = "";
				}
				// get the favs from localstorage
				
				var fav = dataType + "_" + dataID.toString();
				var favData = dataTitle + "|" + dataText + "|" + tipptype;
				var theFavs = JSON.parse(helper.settings.get("Favs"));	
				
				// check if already stored as a fav
				var found = false;
				if ( theFavs == null || theFavs == {} || theFavs == ""  || theFavs == " "){
					theFavs = {};
				}
				else{				
					$.each(theFavs, function(key, value){
						if (key == fav){
							found = true;
							delete theFavs[key];
							if (tipptype != "" && dataType == "tipp"){
								$(".favBtn[datatype='" + dataType + "'][rel='" + dataID + "'][tipptype='" + tipptype + "']").removeClass("red").addClass("white");
							}
							else{
								$(".favBtn[datatype='" + dataType + "'][rel='" + dataID + "']").removeClass("red").addClass("white");
							}
							//$("#popup .favBtn[datatype='" + dataType + "'][rel='" + dataID + "']").removeClass("red");
							// found it - just exit the loop
							return false;
						}	
					});
				}
				
				if (found == false){
					theFavs[fav] = favData; // add description title ... to it
					if (tipptype != "" && dataType == "tipp"){
								$(".favBtn[datatype='" + dataType + "'][rel='" + dataID + "'][tipptype='" + tipptype + "']").removeClass("white").addClass("red");
							}
							else{
								$(".favBtn[datatype='" + dataType + "'][rel='" + dataID + "']").removeClass("white").addClass("red");
							}
				}
				// save back favs to localstorage
				var newFavs = JSON.stringify(theFavs);
				helper.settings.set("Favs", newFavs);
			}
		}
	},
	initialize: function () {
		helper.errorLog("app initialize...");
		// app start procedure
		if(helper.appIsOnline){	
			// handle login
			app.login.handler(false);
			
			// if online, prepare the main app items	
			app.viewMode = helper.url.param.get("hp");	
						
			// initially do not show password cleartext in settings
			$("#settingsUserShowPass").prop("checked",false);
				
			$("#pageTitle").text($(".page.active").attr("pghead"));
			app.page.setTitle("Startseite");
			app.page.setHelp("start");
						
			// check if only to show a single page in fullscreen
			if (app.viewMode != "" ){
				$("#topbar, #statusbar, #mapswitch, #info, #spinner").hide();
				$("<style type='text/css'> .apponly{ display:none!important;} </style>").appendTo("head");
				$("li[rel='map']").css("padding","0");
				$("li").css("padding","0");
				$("#search-panel").css("top","0px");
				
				app.page.show(app.viewMode); // e.g "empty"
				
				var locationview = helper.url.param.get("loc");
					if (locationview != ""){
						app.location.details.show(locationview);
						$("#popup .popup-close").hide();
						$("#popup .popup-title").hide();				
					}
			}
		
			//bind handler for menu items click functions
			app.bind();
			
			// get persistent data objects for later use
			helper.dataAPI("getData","categorys",{},function(err,data){
				if(!err){
					app.obj.categorys = data;
					// update settings screen with categorys
					$("#settingsCategorys").empty();
					var markup="<div class='table'>";
					$.each(data,function(){
						var catInfo=this;
						var catID = catInfo.ID;
						markup += '<div class="tr">';
							markup += '<div class="td">';	
 								markup += '<input type="checkbox" class="setting auth" rel="category' + catInfo.ID + '" vg="' + catInfo.vg + '" vgto="' + catInfo.vgto + '" vgtl="' + catInfo.vgtl + '" fru="' + catInfo.fru + '" pes="' + catInfo.pes + '" lac="' + catInfo.lac + '" alc="' + catInfo.alc + '" />';							
							markup += '</div>';
							markup += '<div class="td">';
								markup += '<span class="catIcon auth" style="color:' + catInfo.Color + ';border-color:' + catInfo.Background + ';">';									
									markup += "<i class='flaticon-" + catInfo.Icon + "'></i>";
								markup += "</span>";									
							markup += '</div>';
							markup += '<div class="td">';
								markup += "</span>&nbsp;&nbsp;" + catInfo.Name;								
							markup += '</div>';	
						markup += '</div>';
					});
					markup += "</div>";
					$("#settingsCategorys").html(markup);
					app.settings.products();
				}
				else{
					helper.errorLog(err);
				}
			});
			// categorys should be already loaded
			app.map.init();
			
			// load statistics only once
			helper.dataAPI("getData","statistics",{},function(err,data){
				if(!err){
					var actLocs = data[0].ActiveLocationsCount;
					var verLocs = data[0].VerifiedLocationsCount;
					var percentVal = parseInt(actLocs / 30);
					var percentColor = "";
					if (percentVal > 80){
						 percentColor = "green";
					}
					else if(percentVal > 50){
						 percentColor = "yellow";					
					}
					else{
						 percentColor = "orange";
					}
					$("img#imgActiveLocations").attr("src",app.imageURL + "?Percentage=" + percentVal + "&backcolor=" + percentColor);
					
					percentVal = parseInt(verLocs/(actLocs/100));
					if (percentVal > 80){
						 percentColor = "green";
					}
					else if(percentVal > 50){
						 percentColor = "yellow";					
					}
					else{
						 percentColor = "orange";
					}
					$("img#imgVerifiedLocations").attr("src",app.imageURL + "?Percentage=" + percentVal + "&backcolor=" + percentColor);
					$("#countActiveLocations").html(actLocs);
					$("#countVerifiedLocations").html(verLocs);
				}
				else{
					helper.errorLog(err);
				}
			});
			
			/** ------------------------------------------------------------------
					load all other background items - app is now ready to be used		
				---------------------------------------------------------------------- */
			//get the data for admin functions if applicable
			helper.dataAPI("getData","adminpage", {},function(err,data){ 
				if(!err){
					$("#admin-page").empty();
					$("#admin-page").append(data);
					$("#menu-admin").removeClass("hidden");
				}
			});
			//get the data for seller functions if applicable
			helper.dataAPI("getData","sellerpage", {},function(err,data){ 
				if(!err){
					$("#seller-page").empty();
					$("#seller-page").append(data);
					$("#menu-seller").removeClass("hidden");
				}
			});
			//load other app items - dependent on login and position
			app.load(true);
		}
		else{
			// error: not online: retry: app.init
			
			
			// finally hide the spinner and splashscreen
			helper.splash.hide();
			helper.spinner.hide();
		}
	},
	load:function(initial){
		// load data now ... initial is true on first load after appstart
		
		// set markers loaded to initial to first try to load data again after setting save
		app.map.markersloaded = -1;
		
		// load other app items - dependent on login, settings and position
		
		// update settings disabled state - for authenticated users
		app.authenticated()
		
		//load settings if logged in only? - WHAT ABOUT LOGIN SETTINGS? - already loaded in helper.init
		// helper.settings.load();
		
		// load actual tipps :  TODO: dependent on preferences for authenticated users ###############################################################
		app.tipp.load();
			
		// load map only after loading cats, because they are needed for the loc list?
		app.map.load();
		
		// finally hide the spinner and splashscreen
		helper.splash.hide();
		helper.spinner.hide();
		
		
		// load fav-tipps which are not in radius -----------------  TODO ###############################################################
			
		
	},
	location:  {
        details:{  
			show:function(locID){			
				//if (typeof(app.obj.locations) !== "undefined" && typeof(app.obj.locations.length) !== "undefined" && app.obj.locations.length != 0 ){
				if (helper.appIsOnline){
					// get info for this location offline
					var data = helper.getObjItem(app.obj.locations, "ID", locID, function(data,isInLocObj){ // isInLocObj = false if this Location is not "near" = is not in LocationObject
						
						if (data != null){				
						var webshort ="";
						var webshort2 ="";
						var webshop ="";
						if(data.Web && data.Web != "" && data.Web != " " && data.Web != "  "){
							/* fix for InAppBrowser Issue on PG Build */							
							webshort = data.Web.replace(/\s+/g, '');
							if (  helper.text.left(webshort,5).toLowerCase() == "http:"  ){
								// nothing to change
							}
							else if ( helper.text.left(webshort,4).toLowerCase() == "www." ){
								webshort = "http://" + webshort;   
							}
							else {
								// no valid URL prefix here ... so add http:
								webshort = 'http://' + webshort;   
							}
							// change slashes to backslashes in url for bbimghandler on generating qrcode
							webshort2 = webshort.replace(/\//g, "\\");   
						}
						
						//wrapper with background-image
						var markup = "<div style='background-image:url(" + '"' + app.imageURL + "?Url=" + webshort + "&width=" + helper.screen.width + "&ratio=screen" + '"' + ");background-repeat: no-repeat;background-size: 100% auto;'>";		
						// get short location info markup
						markup += app.markup.get("locationsmall",app.markup.getlocationparams(data),"forDetails");
						markup += "</div>";	
						
						if(data.WebShop && data.WebShop != "" && data.WebShop != " " && data.WebShop != "  "){
							/* fix for InAppBrowser Issue on PG Build */							
							webshop = data.WebShop.replace(/\s+/g, '');
							if (  helper.text.left(webshop,5).toLowerCase() == "http:"  ){
								// nothing to change
							}
							else if ( helper.text.left(webshop,4).toLowerCase() == "www." ){
								webshop = "http://" + webshop;   
							}
							else {
								// no valid URL prefix here ... so add http:
								webshop = 'http://' + webshop;   
							}   
						}
						
						// Map & Address
						markup += "<div class='content-box'>";		
						markup += "		<div id='detailmap' class='width100 h120p'>";
						markup += "		</div>";
						if(data.Address && data.Address != "" && data.Address != " " && data.Address != "  "){	
							
							markup += "		<div class='table'>";	
							markup += "			<div class='tr'>";		
							markup += "				<div class='td40 h40p vertical-middle align-center'>";		
							markup += "					<i class='fa fa-fw fa-map-marker fa-2x darkgray'></i>"						
							markup += "				</div>";								
							markup += "				<div class='td h40p vertical-middle align-center'>";		
							markup += "					<span class='darkgray small'>" + data.Zip + " " + data.City + ", " + data.Address + "</span>";					
							markup += "				</div>";
							
							if (helper.url.param.get("loc") == ""){
								markup += "				<a class='td40 btn action auth vertical-middle align-center blue ' ";
								if (helper.check.mobileapp){
									var addressEncoded =  encodeURI(data.Address) + ",+" + encodeURI(data.Zip) + ",+" + encodeURI(data.City);
									
									if(app.authstate != false){
										markup += " href='#'  onclick='event.preventDefault();app.location.navigate(&quot;" + addressEncoded + "&quot;);' ";
									}
									else{
										markup += " href='#' class='tr' onclick='event.preventDefault();' ";
									}
								}
								else{
									if(app.authstate != false){
										markup += " href='http://maps.google.at/maps?q=" + addressEncoded + "+Austria&z=10' target='_blank' ";
									}
									else{
										markup += " href='#' class='tr' onclick='event.preventDefault();' ";
									}
								}	
								markup += "				>";
								markup += "				<i class='fa fa-location-arrow'></i>";
								markup += "			</a>";		
							}
							markup += 	"			<div class='td5'>&nbsp;</div>";	
							markup += "		</div>";
						}					
						markup += "		</div>";
						markup += "</div>";
						// Contact data and buttons		
						if(data.Phone && data.Phone != "" && data.Phone != " " && data.Phone != "  "){
							markup += app.markup.get("locationdetailrow",
										{
											icon:"fa-phone",
											text:data.Phone,
											actiontitle:"",
											actionicon:"fa-phone",
											href:"tel:" + data.Phone.replace(/\s+/g, ''),
											onclick:"",
											aclass:""
										});
						
							
						}
						if(data.Cell && data.Cell != "" && data.Cell != " " && data.Cell != "  "){ 
							markup += app.markup.get("locationdetailrow",
										{
											icon:"fa-mobile",
											text:data.Cell,
											actiontitle:"",
											actionicon:"fa-phone",
											href:"tel:" + data.Cell.replace(/\s+/g, ''),
											onclick:"",
											aclass:""
										});
							
						}                    
						if(data.Mail && data.Mail != "" && data.Mail != " " && data.Mail != "  "){ 
							markup += app.markup.get("locationdetailrow",
										{
											icon:"fa-at",
											text:data.Mail,
											actiontitle:"",
											actionicon:"fa-envelope",
											href:"mailto:" + data.Mail.replace(/\s+/g, ''),
											onclick:"",
											aclass:""
										});

						}
						if(data.WebShop && data.WebShop != "" && data.WebShop != " " && data.WebShop != "  "){
							var onclick = "";
							var href="#";
							if (helper.check.mobileapp){
									onclick="event.preventDefault();window.open(&quot;" + webshop + "&quot;,&quot;_system&quot;);"
							}
							else{
									href= "http://" + webshop + "' target='_blank ";
							}
							
							markup += app.markup.get("locationdetailrow",
										{
											icon:"fa-shopping-cart",
											text:data.WebShop,
											actiontitle:"",
											actionicon:"fa-chevron-right",
											href:href,
											onclick:onclick,
											aclass:""
										});
						
						}
						if(data.Web && data.Web != "" && data.Web != " " && data.Web != "  "){
							
							var onclick = "";
							var href="#";
							if (helper.check.mobileapp){
									onclick="event.preventDefault();window.open(&quot;" + webshort + "&quot;,&quot;_system&quot;);"
							}
							else{
									href= "http://" + webshort + "' target='_blank ";
							}
							
							var theInnerPart = 	"";
							theInnerPart += "<a href='" + href + "' onclick='" + onclick + "' class=' block '>";
							theInnerPart +=	"	<span> " + data.Web + "<br></span>";
							theInnerPart += "		<img height='100' width='auto' class='lazy' src='" + app.imageURL + "?Url=" + webshort + "&height=100&ratio=screen' />";
							theInnerPart += "		<img height='100' width='auto' class='lazy hide-xs hide-sm' style='margin-left:10px;' src='" + app.imageURL + "?barcode=1&width=100&height=100&type=qrcode&content=" + encodeURIComponent(webshort2) + "' />";
							theInnerPart +=	"	</span>";
							theInnerPart += "</a>";
							
							markup += app.markup.get("locationdetailrow",
										{
											icon:"fa-globe",
											text:theInnerPart,
											actiontitle:"",
											actionicon:"fa-chevron-right",
											href:href,
											onclick:onclick,
											aclass:""
										});
						}
						// Extra Info 1 (general info on this location)		
						if(data.Extra1 && data.Extra1 != "" && data.Extra1 != " " && data.Extra1 != "  "){
							markup += app.markup.get("locationdetailrow",
										{
											icon:"fa-info",
											text:data.Extra1,
											actiontitle:"",
											actionicon:"",
											href:"#",
											onclick:"event.preventDefault();",
											aclass:" noAction "
										});
						}
						
						// Maerkte Info = Extra2						
						if(data.Extra2 && data.Extra2 != "" && data.Extra2 != " " && data.Extra2 != "  "){
							markup += app.markup.get("locationdetailrow",
										{
											icon:"flaticon-entertaining3",
											text:data.Extra2,
											actiontitle:"",
											actionicon:"",
											href:"#",
											onclick:"event.preventDefault();",
											aclass:" noAction "
										});
						}
						
						// Produkte 	
						if(data.Products && data.Products != "" && data.Products != " " && data.Products != "  "){
							markup += app.markup.get("locationdetailrow",
										{
											icon:"fa-tags",
											text:data.Products,
											actiontitle:"",
											actionicon:"",
											href:"#",
											onclick:"event.preventDefault();",
											aclass:" noAction "
										});
						}
						
						
						//commentswrap header item
						markup += app.markup.get("locationdetailrow",
										{
											icon:"fa-comments",
											text:"Kommentare &amp; Bewertungen",
											actiontitle:"",
											actionicon:"fa-plus",
											href:"#",
											onclick:"app.comment.add(5," + data.ID + ");",
											aclass:" action auth "
										});
						
						
						// commentslist
						markup += "<div class='content-box'>";												
						markup += "		<div id='commentswrapper'></div>";
						markup += "</div>";
						
						// show detail overlay						
							helper.popup.show(  "Detailansicht" ,                                        // overlay title
								markup,     // overlay textarea
								'',                                        				// image for title row (auto resized to 20x20 px)
								false,                                                  // show OK button?
								false,                                                  // show CANCEL button?
								function(){alert('ok clicked');},                       // callback function to bind to the OK button
								function(){alert('cancel clicked');} ,                  // callback function to bind to the CANCEL button
								"",
								"",
								true													// no padding
							);
							
							// bind button functions etc
							var theData = data;
							setTimeout(function(){
								var theLAT = theData.CenterLat;
								var theLON = theData.CenterLon;
								var theLocID = theData.ID;
								//app.voting.markup.getSum("votingswrapperSum" + theData.ID,5,theData.ID, true);
								//app.comment.markup.getSum("commentswrapperSum" + theData.ID,5,theData.ID, true);
								app.comment.markup.get("commentswrapper",5,theData.ID, true);
								app.location.details.mapupdate(theLAT,theLON, theLocID);
												
								if(app.authstate==true){
									app.fav.update();
								}
								// bind events to the short markups
								var theWrapper = $("#popup");
								app.location.details.markupBind(theWrapper);
							},helper.retryTimeOut);
						}
					
					});
				}
				else{
					helper.info.add("error","Kein Zugriff auf das Internet möglich. Bitte stelle eine Onlineverbindung her um die App weiter zu benutzen.",false);
					helper.check.online.info = true;
				}
			},
			markupBind:function(elemWrapper){
				var theItems = elemWrapper.find("div.markupShort");
				$.each(theItems, function(){
					var theID = $(this).attr("rel");
					var theMapBtn = $(this).find(".mapBtn");
					var theFavBtn = $(this).find(".favBtn");
					var theDetailBtn = $(this).find(".detail-btn");
					var theTitle  = $(this).find("h2:first").text();
					
					theMapBtn.off("click");
					theMapBtn.on("click",function(){
						// show on map and center map
						app.location.details.showMap(theID);
					});			
					
					theFavBtn.off("click");
					theFavBtn.on("click",function(){
						// toggle favstatus on/off
						app.fav.toggle(theFavBtn, "location", theID, theFavBtn.attr("dataname"), theFavBtn.attr("datatext"), theFavBtn.attr("tipptype"));
					});
					
					theDetailBtn.off("click");
					theDetailBtn.on("click",function(){
						// show on map and center map
						app.location.details.show(theID);
					});
				});
			},
			showMap:function(locID){
				helper.getObjItem(app.obj.locations, "ID", locID, function(data,isInLocObj){ // isInLocObj = false if this Location is not "near" = is not in LocationObject
					if (data != null){
						$("#listPanel").removeClass("active");
						$("#mapPanel").addClass("active");
						app.page.show("map");
						app.map.coords.find(data.CenterLat, data.CenterLon, 15);
						if(isInLocObj == false){
							app.map.markers.setNotNearMarker(data);
						}
						app.map.location.infoHide();
						app.map.refresh();	
						helper.popup.hide();
						app.menu.close();
					}
					else{
						//error
						
						
					}
				});
			},
			mapupdate:function(lat,lon, locID){
				// init detailmap 
				
				$('#detailmap').height($("div.home-map:first").height());
				$('#detailmap').width($("div.home-map:first").width());
				
				//initialize the detailmap
				/*'http://{s}.tile.osm.org/{z}/{x}/{y}.png'*/
				detailtiles = L.tileLayer('http://otile4.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', { 
				attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}), latlng = new L.LatLng(parseFloat(lat), parseFloat(lon));
					
				detailmap = L.map('detailmap', {zoomControl: false,center: latlng, zoom: 16, layers: [detailtiles]});		
			
				var colorIcon = "img/marker-lightgray.png";
					/* 	Possible colors:
						----------------
						marker-black
						marker-lightgray
						marker-blue
						marker-darkblue
						marker-lightblue
						marker-darkgreen
						marker-lightgreen
						marker-orange
						marker-pink
						marker-red
						
						Possible markerIcons:
						---------------------
						markerSeller
						markerMarket
						markerActivity
						blank16.png
					
					*/
					var markerIcon = "img/blank16.png";
					var theIcon = L.Icon.Default.extend({
						options: {
							iconUrl: markerIcon,
							shadowUrl: colorIcon,

							iconSize:     [39, 56], // size of the icon
							shadowSize:   [39, 56], // size of the shadow
							iconAnchor:   [21, 55], // point of the icon which will correspond to marker's location
							shadowAnchor: [21, 55],  // the same for the shadow
						}
					});
				
				theMarkerIcon = new theIcon(); 
				var marker;
				marker = new  L.LatLng(parseFloat(lat), parseFloat(lon)), 
				marker = new L.Marker(marker,{icon: theMarkerIcon});
				
				detailmap.addLayer(marker); 
				
				var locationview = helper.url.param.get("loc");
				if (locationview != ""){
					detailmap.keyboard.disable();
					
					detailmap.on('click', function(){});	
				}
				else{
					detailmap.dragging.disable();
					detailmap.touchZoom.disable();
					detailmap.doubleClickZoom.disable();
					detailmap.scrollWheelZoom.disable();
					detailmap.boxZoom.disable();
					detailmap.keyboard.disable();
					
					detailmap.on('click', function(){app.location.details.showMap(locID);});	
				}
			}
		},
		navigate:function(addressEncoded){
			if(app.authstate == true){
				window.open("http://maps.google.at/maps?q=" + addressEncoded + ",+Austria&z=10","_system");
			}
		}
	},
	login:{
		handler:function(manual){
		if (typeof(manual) == "undefined"){
			manual = false;
		}
		// autologin ?
			var urlauth =  helper.url.param.get("a");
			if (urlauth == ""){
				// not called from website
				$("body").removeClass("fromWebsite");		
				helper.errorLog("no urlauth");
			}
			else if (urlauth == "noauth"){
				// called from website, but not logged in
				$("body").addClass("fromWebsite");
				helper.errorLog("urlauth mode but noauth");
			}
			else{
				//called from website with auth
				helper.errorLog("urlauth with auth");
				$("body").addClass("fromWebsite");				
			}
			
			if(helper.settings.get("AutoLogin") == true || ( urlauth != "" && urlauth != "noauth" ) ){
				helper.errorLog("urlauth and autologin");
				// get logindata
				if (urlauth != "" && urlauth != "noauth"){
					app.auth = urlauth;
					helper.errorLog("auth set from url - now try to login");
					app.login.now(
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
								app.login.error("url");			
							}
						}					
					);		
				}
				else if (urlauth == "noauth"){
					helper.errorLog("login failed from url because user not logged in on website");
					app.logout();			
				}
				else{					
					helper.errorLog("no urlauth provided - try to get login from locstore");
					var us = helper.settings.get("UserName");
					var pw = helper.settings.get("UserPass");
					if	(us != "" && us != false && pw != "" && pw != false){
						// got login from local store - try to login
						app.auth = Base64.encode(us + ":" + pw);
						app.user = us;
						app.login.now(
							function(result){
								// callback from login function
								if (result != "failed"){
									//nothing to do ... everyting ok
									helper.errorLog("login success from stored data");
								}
								else{
									//login failed - show message - show loginForm?
									helper.errorLog("login failed from stored data");
									app.login.error("stored");			
								}
							}					
						);								
					}
					else{
						// no login in local store
						helper.errorLog("login failed - no login in stored data");
						app.login.error("nostored");
					}
				}
			}
			else{
				if (manual == true){
					// manually login (loginbutton pressed) - ignore "no-autologin" setting.
					var us = helper.settings.get("UserName");
					var pw = helper.settings.get("UserPass");
					if	(us != "" && us != false && pw != "" && pw != false){
						// got login from local store - try to login
						app.auth = Base64.encode(us + ":" + pw);
						app.user = us;
						app.login.now(
							function(result){
								// callback from login function
								if (result != "failed"){
									//nothing to do ... everyting ok
									helper.errorLog("login success from stored data - manual login by buttonpress");
								}
								else{
									//login failed - show message - show loginForm?
									helper.errorLog("login failed from stored data");
									app.logout();			
									app.login.error("stored");			
								}
							}					
						);
					}
					else{
						// no login in local store
						helper.errorLog("login failed - no login in stored data");
						app.login.error("nostored");
					}
				}
				else{
					// do not autologin - use anonymous
					helper.errorLog("login not done - user wants to use anonymous");
					app.logout();	
				}
			}
			
		},
		now:function(callback){
			// try to login
			// get the user info data
			var theCallback = callback;
			helper.errorLog("login now");
			helper.dataAPI("getData","userdata",{},function(err,data){
				if(!err){
					helper.errorLog("login OK");			
					app.obj.user.UserID = data.UserID;
					app.obj.user.UserName = data.UserName;
					app.obj.user.DisplayName = data.DisplayName;
					app.obj.user.Email = data.Email;
					app.obj.user.Approved = data.Approved;
					loginfail = 0;
					app.menu.userinfo();
					app.authstate = true;
					app.authenticated();
					// update user image and name in menu	
					theCallback('ok');
				}
				else{
					helper.errorLog("Login failed");
					app.logout();
					app.loginfail++;
					helper.errorLog(err);
					app.authstate = false;
					app.authenticated();
					theCallback('failed');
				}
			});   
		},
		error:function(details){	
			helper.errorLog("login error:" + details);		
			var header = "Ungültige Anmeldedaten";
			var markup = "<p class='red'>Du hast noch keine Zugangsdaten? Registriere Dich kostenlos und profitiere von vielen nützlichen Funktionen der App.</p><p class='blue'>Wenn Du bereits Zugangsdaten hast, dann speichere Sie in den Einstellungen der App.</p>";
			var icon = "fa fa-user";
			var showOk = true;
			var showCancel = true;
			var btnOkText = "EINSTELLUNGEN";
			var btnCancelText = "REGISTRIEREN";
			funcOk = function(){
				app.logout();	
				app.page.show("settings");
				helper.popup.hide();
				app.menu.close();
			};
			funcCancel = function(){
				app.logout();	
				app.page.show("register");
				helper.popup.hide();
				app.menu.close();
			};
			funcDontShow = function(checkedState){
				//alert(checkedState);
			};
			
			if (typeof(details) != "undefined"){
				switch(details){
					case 'failed':
						// wrong mail or pw
						if (helper.settings.get("DontShowLogInFailed") != "true"){
							header = "??? Ungültige Anmeldedaten";
							markup = "<p class='red'>Deine Zugangsdaten sind falsch!</p><p class='darkgray'>Bitte kontrolliere Deine Einstellungen.</p>";
							icon = "fa fa-lock";
							showOk = true;
							showCancel = false;
							btnOkText = "EINSTELLUNGEN";
							btnCancelText = "";
							funcOk = function(){
								app.logout();	
								app.page.show("settings");
								helper.popup.hide();
								app.menu.close();
							};
							funcCancel = function(){
							
							};
							funcDontShow = function(checkedState){
								if(checkedState == true){
									helper.settings.set("DontShowLogInFailed","true");
								}
								else{
									helper.settings.set("DontShowLogInFailed","false");						
								}
							};
						}
						break;
					case 'stored':
						// invalid stored credentials
						if (helper.settings.get("DontShowLogInStored") != "true"){
							header = "Ungültige Anmeldedaten";
							markup = "<p class='red'>Deine Zugangsdaten sind falsch!</p><p class='darkgray'>Bitte kontrolliere Deine Einstellungen.</p>";
							icon = "fa fa-lock";
							showOk = true;
							showCancel = false;
							btnOkText = "EINSTELLUNGEN";
							btnCancelText = "";
							funcOk = function(){
								app.logout();	
								app.page.show("settings");
								helper.popup.hide();
								app.menu.close();
							};
							funcCancel = function(){
							
							};
							funcDontShow = function(checkedState){
								if(checkedState == true){
									helper.settings.set("DontShowLogInStored","true");
								}
								else{
									helper.settings.set("DontShowLogInStored","false");						
								}
							};
						}
						break;
					case 'nostored':
						// no stored credentials
						if (helper.settings.get("DontShowLogInNoStored") != "true"){
							header = "Keine Anmeldedaten";
							markup = "<p class='red'>Du hast noch keine Zugangsdaten? Registriere Dich kostenlos und profitiere von vielen nützlichen Funktionen der App für registrierte Benutzer.</p><p class='blue'>Wenn Du bereits Zugangsdaten hast, dann gib sie in den Einstellungen der App ein.</p>";
							icon = "fa fa-lock";
							showOk = true;
							showCancel = true;
							btnOkText = "EINSTELLUNGEN";
							btnCancelText = "REGISTRIEREN";
							funcOk = function(){
								app.logout();	
								app.page.show("settings");
								helper.popup.hide();
								app.menu.close();
							};
							funcCancel = function(){
								app.logout();	
								app.page.show("register");
								helper.popup.hide();
								app.menu.close();
							};
							funcDontShow = function(checkedState){
								if(checkedState == true){
									helper.settings.set("DontShowLogInNoStored","true");
								}
								else{
									helper.settings.set("DontShowLogInNoStored","false");						
								}
							};
						}
						break;
					case 'url':
						// failed from url(user not logged in on website)
						if (helper.settings.get("DontShowLogInFromURL") != "true"){
							header = "Nicht angemeldet";
							markup = "<p class='red'>Anmeldung fehlgeschlagen.<br>Du hast noch keine Zugangsdaten? Registriere Dich kostenlos.</p><p class='blue'>Wenn Du bereits Zugangsdaten hast, dann melde Dich bitte mit Deinen Zugangsdaten an.</p>";
							icon = "fa fa-lock";
							showOk = false;
							showCancel = false;
							btnOkText = "";
							btnCancelText = "";
							funcOk = function(){
							};
							funcCancel = function(){
							};
							funcDontShow = undefined;
						}
						break;
				}		
			}
			
			helper.popup.show(header,
					markup,
					icon,
					showOk,
					showCancel,
					function () { // callback from OK button
						funcOk();
					},
					function () { // callback from CANCEL button
						funcCancel();
					},
					btnOkText,
					btnCancelText,
					false, //nopadding
					false, //buttonsTop
					funcDontShow
			);	
			
			app.authenticated();
		},
		register:function(){
			// getData{a:'anonymous',d:'register',fn:'',ln:'',dn:'don',em:'@gmail.com',pw:'xkcuna9s'}
			
			helper.spinner.show(true,false);
			var dn= $("#registermask input[rel='DisplayName']").val();
			var em= $("#registermask input[rel='Email']").val();
			var pw= $("#registermask input[rel='Password']").val();
			var ac= $("#registermask input[rel='Accept']").prop("checked");
			// form-validation
			var valid = true;
			if(dn == "" || dn == " " || dn.length < 3){
				$("#valDisplayName").addClass("active");
				valid=false;
			}
			else{
				$("#valDisplayName").removeClass("active");
			}		
			if(em == "" || em == " " || em.length < 8 || helper.validate(em,'email') == false ){
				$("#valEmail").addClass("active");
				valid=false;
			}
			else{
				$("#valEmail").removeClass("active");
			}		
			if(pw == "" || dn == " " || dn.length < 3){
				$("#valPassword").addClass("active");
				valid=false;
			}
			else{
				$("#valPassword").removeClass("active");
			}		
			if(ac == false){
				$("#valAccept").addClass("active");
				valid=false;
			}
			else{
				$("#valAccept").removeClass("active");
			}		
			if (valid == true){	
				helper.dataAPI("getData","register",{a:'anonymous',fn:'',ln:'',dn:dn,em:em,pw:pw},function(err,data){
					if(!err){
						// check response
						switch(data){
							case 'BannedPasswordUsed':
								$("#valPassword").addClass("active");
								helper.info.add("warning", "Dieses Kennwort ist nicht gültig, bitte wähle ein anderes Kennwort", true);
								break;
							case 'DuplicateDisplayName':
								$("#valDisplayName").addClass("active");
								helper.info.add("warning", "Dieser Anzeigename ist bereits vergeben, bitte wähle einen anderen Anzeigenamen", true);
								break;
							case 'DuplicateEmail':
								helper.info.add("warning", "Für diese Emailadresse existiert bereits ein Benutzerkonto. Bitte melde Dich mit Deinen bestehenden Benutzerdaten an.", true);		
								break;
							case 'DuplicateUserName':
								helper.info.add("warning", "Für diese Emailadresse existiert bereits ein Benutzerkonto. Bitte melde Dich mit Deinen bestehenden Benutzerdaten an.", true);
								break;
							case 'InvalidDisplayName':
								$("#valDisplayName").addClass("active");
								helper.info.add("warning", "Dieser Anzeigename ist ungültig, bitte wähle einen anderen Anzeigenamen.", true);
								break;
							case 'InvalidEmail':
								$("#valEmail").addClass("active");	
								break;
							case 'InvalidPassword':
								$("#valPassword").addClass("active");
								break;
							case 'InvalidUserName':
								$("#valEmail").addClass("active");	
								break;	
							case 'UserAlreadyRegistered':
								helper.info.add("warning", "Für diese Emailadresse existiert bereits ein Benutzerkonto. Bitte melde Dich mit Deinen bestehenden Benutzerdaten an.", true);						
								break;	
							case 'UsernameAlreadyExists':
								helper.info.add("warning", "Für diese Emailadresse existiert bereits ein Benutzerkonto. Bitte melde Dich mit Deinen bestehenden Benutzerdaten an.", true);
								break;	
							case 'Success':
								// inform user about authorization system
								app.registered();	
								break;					  
							default:
								// "Error"
								helper.errorLog("Error on registering user " + data );
								helper.info.add("error", "Leider ist bei der Registrierung Deines Benutzerkontos ein Fehler aufgetreten. Bitte starte die App neu und versuche es nochmals.", true);
								break;
						}
						helper.spinner.hide();
			
					}
					else{
						helper.errorLog(err);
						helper.spinner.hide();
			
					}
				});   
			}
		},
	},
	registered:function(){
		app.page.show("start");
		app.menu.close();
		app.page.showHelp("registersuccess");
	},
	logout:function(){
		// clear userinfo
		helper.errorLog("logout called");
		app.obj.user = {};
		app.user = '';
		app.auth = 'anonymous'
		app.menu.userinfo();	
		app.authstate = false;
		app.authenticated();
	},
	map:{
		clusterRadius: 50,
		markersloaded:-1,
		zoom: 9,
        click:function(e){
			//helper.errorLog("You clicked the map at " + e.latlng);			
				if (helper.gps.mode == "manual"){
					helper.gps.lat = e.latlng.lat.toString();					
					helper.gps.lon = e.latlng.lng.toString();
					markersloaded = -1;
					app.load();
				}
		},
		coords:{			
			find:function(coordLat, coordLon, zoom){
				if(typeof(zoom) == "undefined"){
				if (map.getZoom()){
						zoom = map.getZoom();
					}
					else{
						zoom = app.map.zoom;
					}
					
				}
				map.setView([coordLat, coordLon], zoom);
				//map.panTo(new L.LatLng(coordLat, coordLon));
			}
		},
		gpsupdate:function(){ // called on successful coord retrieval
			// update userposition marker
			app.map.user.position.update();
			// center minimap to found position
			app.map.minimap.center(parseFloat(helper.gps.lat),parseFloat(helper.gps.lon));
			app.map.ready()
		},
		init: function(){		
				helper.errorLog("map init ...");
				// init Map - workaround for map size bug
				$('#mapPanel').height($(document).height());
				$('#mapPanel').width($(document).width());
				
				
				$('#map').height($(document).height());
				$('#map').width($(document).width());
				
				
				// init minimap
				$('#minimap').height($("div.home-map:first").height());
				$('#minimap').width($("div.home-map:first").width());
				
				// lat & lon Stephansdom
				var theLat = 48.20857355;
				var theLon = 16.37254714;

				if (helper.gps.state == true){
					theLat = helper.gps.lat;
					theLon = helper.gps.lon;
				}
				//initialize the map page
				/*http://{s}.tile.osm.org/{z}/{x}/{y}.png*/
				tiles = L.tileLayer('http://otile4.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', { 
					attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}), latlng = new L.LatLng(parseFloat(theLat), parseFloat(theLon));
				
				minitiles = L.tileLayer('http://otile4.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {
					attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}), latlng = new L.LatLng(parseFloat(theLat), parseFloat(theLon));
								
				map = L.map('map', {center: latlng, zoom: app.map.zoom, layers: [tiles]});		
				minimap = L.map('minimap', {zoomControl: false,center: latlng, zoom: 8, layers: [minitiles]});		
				
				//add custom controls to the map
				L.easyButton('fa-street-view', 
				  function (){app.map.user.position.find();},
				 'Deine Position anzeigen',
				 map,
				 'btnUserPos'
				)
				
				L.easyButton('fa-dot-circle-o', 
				  function (){app.map.user.position.setmode();},
				 'Eine andere Positon bestimmen',
				 map,
				 'btnSetPos'
				)
								
				if (app.viewMode != ""){
					// workaround for iframe problems with leaflet
					map.keyboard.disable();
					map.touchZoom.disable();
					map.doubleClickZoom.disable();
				}
				
				minimap.dragging.disable();
				minimap.touchZoom.disable();
				minimap.doubleClickZoom.disable();
				minimap.scrollWheelZoom.disable();
				minimap.boxZoom.disable();
				minimap.keyboard.disable();
		
				//app.map.load();
				
				
				
		},
		load: function(){				
				// clear layers
				if(markersGroup){
					markersGroup.clearLayers();		
				}
				if (map.hasLayer(mePosMarker)){				
					map.removeLayer(mePosMarker);
				}
				if (map.hasLayer(layerNotNear)){				
					map.removeLayer(layerNotNear);
				}
				if (map.hasLayer(markersGroup)){	
					map.removeLayer(markersGroup);
				}
				if (map.hasLayer(circle)){				
					map.removeLayer(circle);
				}
				
				// define meMarker - this is a special "updateable" marker for the users positon hat will be updated by a interval and not set over and over again 
				var meIcon = L.Icon.extend(
				{
					options: {
						iconUrl: 	'img/userpos32.png',
						iconSize: 	new L.Point(32, 32),
						iconAnchor: new L.Point(14, 14),
						shadowUrl: 	'img/blank16.png',
						shadowSize: new L.Point(28, 28),
						popupAnchor:new L.Point(0, -12),
						zIndexOffset:10000
					}
				});
				
				var minimeIcon = L.Icon.extend(
				{
					options: {
						iconUrl: 	'img/userpos12.png',
						iconSize: 	new L.Point(12, 12),
						iconAnchor: new L.Point(6, 12),
						shadowUrl: 	'img/blank16.png',
					}
				});
				
				meMarkerIcon = new meIcon(); 
				mePosMarker = new  L.LatLng(parseFloat(helper.gps.lat), parseFloat(helper.gps.lon)), mePosMarker = new L.Marker(mePosMarker,{icon: meMarkerIcon});
				mePosMarker.on('click',function(e){
					app.map.user.position.click(e);
				});
				map.addLayer(mePosMarker);  
				
				minimeMarkerIcon = new minimeIcon(); 
				minimePosMarker = new  L.LatLng(parseFloat(helper.gps.lat), parseFloat(helper.gps.lon)), minimePosMarker = new L.Marker(minimePosMarker,{icon: minimeMarkerIcon});
				minimap.addLayer(minimePosMarker);  
				
				// define click function on map
				map.on('click', app.map.click);
				// necessary to do this in a separate function call because of parameters?
				minimap.on('click', app.map.minimap.click);
				
				// update the style of the "setPos" Button Control
				app.map.user.position.modeupdate();
				
				// load markers if possible
				app.map.ready();
				
				app.map.visible();
				
        },
		ready:function(){
			if(helper.gps.state == true || (helper.gps.mode == "manual") ){
				// readycheck was positive or is in manual positioning mode - now get markers for locations in radius
				// and set user position marker
				if(app.map.markersloaded == -1){
					app.map.markers.update();
				
					app.map.coords.find(parseFloat(helper.gps.lat),parseFloat(helper.gps.lon),9);
					// center minimap to found position
					app.map.minimap.center(parseFloat(helper.gps.lat),parseFloat(helper.gps.lon));
				}
			}
			else{
				setTimeout(function(){
					app.map.ready();
				},helper.retryTimeOut);
			}
		},
		location:{
			info:function(locID){
				$(".map-info-inner").empty();	
				$("#mapinfo").attr("rel","0");
				if (typeof(app.obj.locations) !== "undefined" && typeof(app.obj.locations.length) !== "undefined" && app.obj.locations.length != 0 ){
					// get info for this location offline
					
					helper.getObjItem(app.obj.locations, "ID", locID, function(data,isInLocObj){
						if (data != null){	
							var item = data;
							var markup = app.markup.get("locationsmall",app.markup.getlocationparams(item));
					
							markup = markup.replace("votingswrapperSum","votingswrapperSumInfo");
							markup = markup.replace("commentswrapperSum","commentswrapperSumInfo");
							markup = markup.replace("qualitywrapper","qualitywrapperInfo");
							
							$(".map-info-inner").html(markup);
							helper.tooltips.update();
							$("#mapinfo").attr("rel",locID);
							$("#mapinfo").addClass("open");
							var theLocation = item;
							setTimeout(function(){
								var theWrapper = $("#mapinfo");
								// bind events to the short markups
								app.location.details.markupBind(theWrapper);
								//app.voting.markup.getSum("votingswrapperSumInfo" + theLocation.ID,5,theLocation.ID,true);
								//app.comment.markup.getSum("commentswrapperSumInfo" + theLocation.ID,5,theLocation.ID, true);
								app.fav.update();
							},helper.retryTimeOut);
						}
						else{
						
						}
					});
					
				}
			},
			infoHide:function(){
				$("#mapinfo").removeClass("open");
				$("#mapinfo").attr("rel","0");
			}
		},
		markers:{
			click: function(locID){
				if(app.viewMode == ""){
					if (locID == $("#mapinfo").attr("rel") ){
						// markerinfo already shown in footer
						
						app.location.details.show(locID);
					}
					else{
						app.map.location.info(locID);
					}
				}
				else{
					// in webview show detailsscreen directly
					app.location.details.show(locID);
				}
			},
			clear:function(){
				if (typeof(markers) != "undefined"){
					map.removeLayer(markers);
					minimap.removeLayer(markers);
				}
				// fix for markercluster issue: markers still stay if only layer is removed - add "markersGroup.clearLayers() to also remove markers from the Group
				// attribution to:http://stackoverflow.com/questions/18706743/cant-remove-layers-with-clusters-in-leaflet-js
				if(markersGroup){
					markersGroup.clearLayers();		
				}
			},
			update: function(){			
				// clear current markers
				app.map.markers.clear();
				// get current set position
				// get radius to show
				var radiusToShow = helper.settings.get("Radius");
				// load locations in radius
				if (radiusToShow < 1){
					var defaultRadius = $('input[rel="Radius"]').attr("default-value");
					radiusToShow = parseInt(defaultRadius);
				}
				
				var theCircleRadius = (radiusToShow * 1000) ;
				circle = L.circle([parseFloat(helper.gps.lat), parseFloat(helper.gps.lon)], theCircleRadius, {
					color: '#18A1A8',
					fillColor: '#F9F9F9',
					weight: 2,
					fillOpacity: 0.1
				}).addTo(map);
				
				var coordOffset = helper.gps.calc.offset(radiusToShow);
				var latMin = parseFloat(helper.gps.lat) - parseFloat(coordOffset);
				var lonMin = parseFloat(helper.gps.lon) - parseFloat(coordOffset);
				var latMax = parseFloat(helper.gps.lat) + parseFloat(coordOffset);
				var lonMax = parseFloat(helper.gps.lon) + parseFloat(coordOffset);
				
				var options ={latMin: latMin.toString(), lonMin: lonMin.toString(), latMax: latMax.toString(), lonMax: lonMax.toString()};
				helper.dataAPI("getData","locations", options,function(err,data){
					if(!err){
						if (data.length < 1){
							helper.info.add("warning", "<span class='btn' onclick='app.page.show(" + '"settings"' + ");'>Keine Anbieter in der Nähe gefunden!&nbsp;-&nbsp;<i class='fa fa-cog'></i>&nbsp;Einstellungen ändern</span>", true, false);	
							// set loaded count to zero
							app.map.markersloaded = 0;
						}
						else{						
							app.obj.locations = data;
							
							// set the markers and loclist now
							app.map.markers.set();
														
							helper.info.add("success", "<span class='btn' onclick='app.page.show(" + '"map"' + ");'>" + data.length + " Anbieter in Deiner Nähe gefunden!</span>", true, false);
						}
					}
					else{
						helper.errorLog(err);
					}
				});    
				// if count = 0 -> info change radius or location
				
				// set markers in map
			},
			set: function(){
				markersGroup = new L.markerClusterGroup({maxClusterRadius: app.map.clusterRadius});
				var minimarkersGroup = new L.layerGroup();    
				//var markers = l.Marker();
				helper.errorLog("Adding Markers");
				
				var counter = 0;
				var counterHof = 0;
				var counterMarkt = 0;
				var counterOther = 0;
				var showMarkets = "true";
				
				if(helper.settings.get("showMarkets") == false){
					showMarkets ="false";
				}		
				
				// also build list of locations for listview
				$("#locList").empty();
				var locListMarkup = "";
				$.each(app.obj.locations,function(){
					var item = this;					
					var markerIcon = "";
					var minimarkerIcon = "";
					var theLayer;
					switch(item.LocationType){
						case 1:
							// seller
							markerIcon="img/markerSeller.png";
							minimarkerIcon="img/marker-seller.png";
							//theLayer = layerSeller;
							break;
						case 2:
							// market
							markerIcon="img/markerMarket.png";
							minimarkerIcon="img/marker-market.png";
							//theLayer = layerMarket;
							break;
						case 3:
							// activity
							markerIcon="img/markerActivity.png";
							minimarkerIcon="img/marker-activity.png";
							//theLayer = layerActivity;
							break;
						default:
							// other
							markerIcon="img/markerOther.png";
							minimarkerIcon="img/marker-other.png";
							//theLayer = layerOther;
							break;							
					}					
					var colorIcon = "img/marker-lightgray.png";
					/* 	Possible colors: marker-black, marker-lightgray, -blue, -darkblue, -lightblue, -darkgreen, -lightgreen, -orange, -pink, -red
						Possible markerIcons: markerSeller, markerMarket, markerActivity, blank16.png */
					var theIcon = L.Icon.Default.extend({
						options: {
							iconUrl: markerIcon,
							shadowUrl: colorIcon,

							iconSize:     [39, 56], // size of the icon
							shadowSize:   [39, 56], // size of the shadow
							iconAnchor:   [21, 55], // point of the icon which will correspond to marker's location
							shadowAnchor: [21, 55],  // the same for the shadow
						}
					});
					var theMiniIcon = L.Icon.Default.extend({
						options: {
							iconUrl: minimarkerIcon,
							shadowUrl: "img/blank16.png",
							iconSize: new L.Point(8, 8),
							iconAnchor: new L.Point(0, 0)
						}
					});					
					// only set marker if not settings should prevent showing MarketPlaces
					if (item.LocationType == 2 && showMarkets == "false" ){
						// dont set the marker
					}
					else{
						theMarkerIcon = new theIcon(); 
						theMiniIcon = new theMiniIcon(); 
						marker = new  L.LatLng(parseFloat(item.CenterLat), parseFloat(item.CenterLon)), 
						marker = new L.Marker(marker,{icon: theMarkerIcon, title: item.Name, id: item.ID });
						
						minimarker = new  L.LatLng(parseFloat(item.CenterLat), parseFloat(item.CenterLon)), 
						minimarker = new L.Marker(minimarker,{icon: theMiniIcon, title: item.Name, id: item.ID });
						
						marker.on('click',function(e){
							app.map.markers.click(e.target.options.id);
						});						
						/*	... clustering broken initially when trying this
							theLayer.addLayer(marker); */
						markersGroup.addLayer(marker); 
						minimarkersGroup.addLayer(minimarker); 
						
						// append to locList markup
						locListMarkup +=app.markup.get("locationitem",app.markup.getlocationparams(item));
								
						counter++;	
					}							
					/*
						var marker = L.marker(new L.LatLng(item.CenterLat, item.CenterLon), {  title: item.Name, id: item.ID });
						marker.on('click',function(e){
							app.map.markers.click(e.target.options.id);
							});
						//marker.bindPopup(title);	
						markers.addLayer(marker);		
					*/
				});	
				
				app.map.markersloaded = counter;
				/*markersGroup.addLayer(layerSeller);
				markersGroup.addLayer(layerMarket);
				markersGroup.addLayer(layerActivity);
				markersGroup.addLayer(layerOther);*/
				locListMarkup = locListMarkup.replace(/votingswrapperSum/g, 'votingswrapperSumList');
				locListMarkup = locListMarkup.replace(/commentswrapperSum/g, 'commentswrapperSumList');
				locListMarkup = locListMarkup.replace(/qualitywrapper/g, 'qualitywrapperList');
				
				$("#locList").empty();
				$("#locList").append(locListMarkup);
				// sort list by distance
				var $locLIST = $('#locList');
				var $locLISTli = $locLIST.children('li');

				$locLISTli.sort(function(a,b){
					var an = parseInt(a.getAttribute('sort')),
						bn = parseInt(b.getAttribute('sort'));

					if(an > bn) {
						return 1;
					}
					if(an < bn) {
						return -1;
					}
					return 0;
				});

				$locLISTli.detach().appendTo($locLIST);
				
				helper.tooltips.update();
				
				setTimeout(function(){
					var theWrapper = $("#locList");
					// bind events to the short markups
					app.location.details.markupBind(theWrapper);
					$.each(app.obj.locations,function(){
						var theLocationID = this.ID;						
						//app.voting.markup.getSum("votingswrapperSumList" + theLocationID,5,theLocationID, true);
						//app.comment.markup.getSum("commentswrapperSumList" + theLocationID,5,theLocationID, true);
					});					
				},helper.retryTimeOut);
				
				
				$("#minimapNearCounter").html(counter);
				$("#minimapNearCounterHof").html(counterHof);
				$("#minimapNearCounterMarkt").html(counterMarkt);
				
				map.addLayer(markersGroup);
				minimap.addLayer(minimarkersGroup);
				
			},
			setNotNearMarker:function(objLocation){
					var colorIcon = "img/marker-red.png";
					/* 	Possible colors:
						----------------
						marker-black
						marker-lightgray
						marker-blue
						marker-darkblue
						marker-lightblue
						marker-darkgreen
						marker-lightgreen
						marker-orange
						marker-pink
						marker-red
						
						Possible markerIcons:
						---------------------
						markerSeller
						markerMarket
						markerActivity
						blank16.png
					
					*/
					var markerIcon = "img/blank16.png";
					var theIcon = L.Icon.Default.extend({
						options: {
							iconUrl: markerIcon,
							shadowUrl: colorIcon,

							iconSize:     [39, 56], // size of the icon
							shadowSize:   [39, 56], // size of the shadow
							iconAnchor:   [21, 55], // point of the icon which will correspond to marker's location
							shadowAnchor: [21, 55],  // the same for the shadow
						}
					});
				
				theMarkerIcon = new theIcon(); 
				var marker;
				var nearRadius = helper.settings.get("Radius");
				if (nearRadius < 1){
					var defaultRadius = $('input[rel="Radius"]').attr("default-value");
					nearRadius = parseInt(defaultRadius);
				}				
				marker = new  L.LatLng(parseFloat(objLocation.CenterLat), parseFloat(objLocation.CenterLon)), 
				marker = new L.Marker(marker,{icon: theMarkerIcon, title: objLocation.Name + ": nicht im Umkreis von " + nearRadius + "km!" , id: objLocation.ID});

				marker.on('click',function(e){
					app.map.markers.click(e.target.options.id);
				});
				
				map.addLayer(marker); 
				helper.info.add("warning", objLocation.Name + " ist weiter als " + nearRadius + " km entfernt!", true, false);
			}
		},
		minimap:{
			click:function(e){
				//helper.errorLog("You clicked the map at " + e.latlng);			
				app.page.show("map");
			},
			center:function(lat,lon,zoom){	
				if(typeof(zoom) == "undefined"){
					zoom = 8;
				}
				if(minimePosMarker){
					minimap.setView([parseFloat(helper.gps.lat), parseFloat(helper.gps.lon)], zoom);
					minimePosMarker.setLatLng([parseFloat(helper.gps.lat),parseFloat(helper.gps.lon)]).update();
				}
				else{
					setTimeout(function(){
						app.map.minimap.center();
					},helper.retryTimeOut);
				}
				
			}
		},
		refresh:function(){
			if (map){
				helper.errorLog("Refreshing Map");
				map.invalidateSize(false);
			}
		},
		user:{
			position:{
				click:function(){
					// actions on click on userposition marker
					
				},
				find:function(){
						var actZoomLevel;
						if (map.getZoom()){
							actZoomLevel = map.getZoom()
						}
						else{
							actZoomLevel = app.map.zoom;
						}
						map.setView(new L.LatLng(parseFloat(helper.gps.lat),parseFloat(helper.gps.lon)),actZoomLevel);
				},
				modeupdate:function(){
					if (app.authstate == true){
						if (helper.gps.mode == "manual"){
							//set class of control to active (blink??)
							$("#btnSetPos").addClass("blink");
							$("#btnSetPos").addClass("activeLeafBtn");
							helper.info.add("tipp", "MANUELLE POSITIONIERUNG:<br>Du kannst jetzt Deinen Standort auf der Karte bestimmen.", true, false);
						}
						else{			
							//set class of control to inactive (no blink??)
							$("#btnSetPos").removeClass("blink");
							$("#btnSetPos").removeClass("activeLeafBtn");
							helper.info.add("tipp", "AUTOMATISCHE POSITIONIERUNG:<br>Dein aktueller Standort wird auf der Karte angezeigt.", true, false);
						}
					}
				},
				setmode:function(){
					if (helper.gps.mode == "auto"){
						helper.gps.mode = "manual";
					}
					else{
						helper.gps.mode = "auto";					
					}
					app.map.user.position.modeupdate();
				},
				update:function(){
					if(mePosMarker){
						mePosMarker.setLatLng([parseFloat(helper.gps.lat),parseFloat(helper.gps.lon)]).update();	
					}
					else{
						setTimeout(function(){
							app.map.user.position.update();
						},helper.retryTimeOut);
					}
				}
			}
		},
		visible:function(){
			if (app.viewMode != ""){
				if ($("ul.pages li[rel='map']:first").css("display") != "none"){
					//setBounds only works if map is visible ... hidden map cannot be set to bounds
					var offset = helper.gps.coords.calc.offset(20);
					var boundsLatMin = parseFloat(helper.gps.lat) - parseFloat(offset);
					var boundsLatMax = parseFloat(helper.gps.lat) + parseFloat(offset);
					var boundsLonMin = parseFloat(helper.gps.lon) - parseFloat(offset);
					var boundsLonMax = parseFloat(helper.gps.lon) + parseFloat(offset);
					
					var southWest = new L.LatLng(boundsLatMin, boundsLonMin);
					var northEast = new L.LatLng(boundsLatMax, boundsLonMax);
					var bounds = new L.LatLngBounds(southWest, northEast);
					bounds = new L.LatLngBounds(southWest, northEast);
					map.fitBounds(bounds,{maxZoom:18});
					var zoomfact = map.getZoom() - 2;
					if (zoomfact <= 0){
						zoomfact = 1;
					}
					
					map.setZoomLevel(zoomfact);
				}
				else{
					setTimeout(function(){
						app.map.visible();					
					},500);
				}
			}
			app.map.refresh();
		},
	},
	/** return markup parts based on templates ----------
		------------------------------------------------- */
	markup:{
		get:function(template,placeholders,extrainfo){
			var markup = app.markup.template[template](extrainfo);
			// replace placeholders
			$.each(placeholders, function(key,value){
				var ph = "[|" + key.toUpperCase() + "|]";
				markup = helper.text.replaceAll(markup,ph,value);
			});
			// replace remaining Placeholders
			
			
			return markup;			
		},
		template:{
			searchitem:function(extrainfo){
				var markup = "";
				markup += "<li class='content-box nomargin nopadding' onclick='[|ONCLICK|]' sort='[|DIST|]'>";
				markup += 	"	<div class='table'>";							
				markup += 	"		<div class='tr vertical-middle'>";
				markup += 	"			<div class='td60 align-center vertical-middle'>";	
				markup +=	"				<i class='[|ICON|] align-center vertical-middle'></i>[|ICONTEXT|]";	
				markup += 	"			</div>";			
				markup += 	"			<div class='td align-left vertical-middle'>";
				markup += 	"				<h4 class='blue nomargin'>[|NAME|]</h4>";
				markup +=  "				<p class='align-left darkgray small nomargin'>[|TEXT|]</p>";
				markup += 	"			</div><div class='td10'></div>";	
				markup += 	"			<div class='td40 align-center vertical-middle blue '>";
				markup += 	"				<i class='fa fa-chevron-right'></i>";
				markup += 	"			</div><div class='td5'></div>";						
				markup += 	"		</div>";						
				markup += 	"	</div>";		
				markup += "</li>";
				return markup;
			},
			locationitem:function(extrainfo){
				var markup = "";
				markup += "<li class='content-box nomargin nopadding' sort='[|SORT|]' tp='[|ICONTEXT|]'>";
				markup += app.markup.template["locationsmall"](extrainfo);		
				markup += "</li>";
				return markup;
			},
			locationsmall:function(extrainfo){
				var markup = "";
				markup += "		<div class='markupShort white-bg-t9' rel='[|ID|]'>";
				if($("#menu-admin").hasClass("hidden") == false){
					markup += "<i class='btn w30p h30p vertical-middle align-center fa fa-edit [|STATUSCOLOR|] block' style='margin:3px 0 0 3px; z-index: 12; position: absolute; top: 30px; font-size: 1em; left: -5px;line-height:30px;' onclick='appadmin.location.edit([|ID|])'></i>";				
					// markup += "<i class='btn w30p h30p vertical-middle align-center fa fa-edit [|STATUSCOLOR|] block' style='margin:3px 0 0 3px; z-index: 12; position: absolute; top: 0px; font-size: 1em; left: 20px;line-height:30px;' onclick='appadmin.location.edit([|ID|])'></i>[|HASWEB|]";				
				}
				//main table 
				markup += "		<div class='table'>";
				markup += 	"		<div class='tr vertical-middle'>";
				markup += 	"			<div class='detail-btn td60 vertical-middle align-center nopadding '>";
				markup +=	"				<i class='[|ICON|] block align-center vertical-middle'></i>";
				markup += 	"					<div class='small'>[|ICONTEXT|]</div>";					
				markup += 	"					<div class='small'>[|DISTANCE|]</div>";	
				markup += 	"			</div>";			
				markup += 	"			<div class='td align-left vertical-top pad-5'>";
				markup += 	"				<h4 class='blue nomargin'>[|NAME|]</h4>";
				markup +=   "				<div class='featureList align-left darkgray small'>";
				markup +=	"					[|DATASTATUS|][|CERT|] [|FEATURES|]";
				markup +=   "				</div>";
				markup +=   "				<div class='openingWrap align-left darkgray small nomargin'>";
				markup +=	"					[|OPENING|]";
				markup +=   "				</div>";
				
				
				markup +=   "				<div class='align-left darkgray nomargin'>";
				markup += 	"					<span id='votingswrapperSum[|ID|]' class='small'>[|VOTINGS|]</span>&nbsp;&nbsp;";
				markup += 	"					<span id='commentswrapperSum[|ID|]' class='small'>[|COMMENTS|]</span>&nbsp;&nbsp;";
				/*
				markup += 	"					<span id='qualitywrapper[|ID|]' class='small'><i class='fa fa-check-circle green'></i><span class='votingcount'>&nbsp;( 0 )</span></span>";
				*/
				markup +=   "				</div>";
				markup += 	"			</div>";
				markup += 	"			<div class='td10'></div>";	
				markup += 	"			<div class='td40 align-center vertical-top '>";
				// right buttons
				if (helper.url.param.get("loc") == ""){
					markup += "					<div class='table'>";
					markup += "						<div class='tr'>";
					markup += "							<div class='td40 h40p vertical-middle align-center btn action auth favBtn blue ' rel='[|ID|]' datatype='location' dataname='[|NAME|]' datatext='[|ZIP|] [|CITY|], [|ADDRESS|]' tipptype='[|TYPE|]'>";
					markup += "								<i class='fa fa-heart'></i>";	
					markup += "							</div>";		
					markup += "						</div>";	
					markup += "						<div class='tr vertical-middle'>";	
				
					if (extrainfo && extrainfo == "forDetails"){ //map-
						markup += "							<div class='td40 h40p vertical-middle align-center auth mapBtn blue '>";
						markup += "								<i class='fa fa-map-marker'></i>";	
					}
					else{//detail button
						markup += "							<div class='td40 h40p vertical-middle align-center auth detailBtn blue ' onclick='app.location.details.show([|ID|]);'>";
						markup += "								<i class='fa fa-chevron-right'></i>";		
					}
					markup += "							</div>";		
					markup += "						</div>";		
					markup += "					</div>";
				}
							
				markup += 	"			</div>";
				markup += 	"			<div class='td5'>&nbsp;</div>";						
				markup += 	"		</div>";
				//main table end
				markup += 	"	</div>";
				// categorys 
				markup += "		<div class='table'>";
				markup += 	"		<div class='tr vertical-middle'>";
				markup += 	"			<div class='td align-left vertical-middle'>";				
				markup += 	"				[|CATEGORYS|]";				
				markup += 	"			</div>";	
				markup += 	"		</div>";
				markup += 	"	</div>";
				//categorys end
				
				return markup;
			},
			locationdetailrow:function(extrainfo){
				var markup = "";
				
				markup += "<div class='content-box'>";		
				markup += "		<div class='table'>";									
				markup += "			<div class='tr '>";				
				markup += "				<div class='td40 vertical-middle align-center'>";		
				markup += "					<i class='fa [|ICON|] fa-fw'></i>";					
				markup += "				</div>";								
				markup += "				<div class='td h40p vertical-middle align-center'>";		
				markup += "					<p class='small align-center nomargin'>[|TEXT|]</p>";						
				markup += "				</div>";
				if (helper.url.param.get("loc") == ""){
					
					markup += "				<a href='[|HREF|]' class='td40 btn  vertical-middle align-center blue [|ACLASS|]' title='[|ACTIONTITLE|]' onclick='[|ONCLICK|]'>";
					markup += "					<i class='fa [|ACTIONICON|]'></i>";
					markup += "				</a>";		
				}
				markup += 	"			<div class='td5'>&nbsp;</div>";	
				markup += "			</div>";									
				markup += "		</div>";						
				markup += "</div>";
							
				return markup;
			},
			catlistitem:function(extrainfo){
				var markup = "";
				markup += "<span class='catIcon small' style='color:[|COLOR|];background-color:#fff; border-color:[|COLOR|];' ";
				markup += " title='[|NAME|]'>";
				markup += "<i class='flaticon-[|ICON|]'></i>";
				markup += "</span>";
				return markup;
			}, 
			favitem:function(extrainfo){
				var markup = "";
				markup += "<li class='content-box searchItem white-bg extralightgray-bd bd1 nopadding nomargin'>";
				markup += 	"	<div class='table'>";							
				markup += 	"		<div class='tr vertical-middle'>";
				markup += 	"			<div class='td60 align-center vertical-middle' >";		
				markup += 	"				<i class='[|ICON|] align-center vertical-middle'></i>[|ICONTEXT|]";
				markup += 	"			</div><div class='td5'></div>";			
				markup += 	"			<div class='td align-left vertical-middle'>";
				markup += 	"				<h4 class='blue nomargin'>[|HEADLINE|]</h4>";
				markup +=   "				<p class='align-justify darkgray small ellipsis'>[|TEXT|]</p>";
				markup +=   "			</div>";
				markup += 	"			<div class='td10'></div>";	
				markup += 	"			<div class='td40 align-center vertical-middle'>";													
				markup += 	"				<span class='table'>";
				markup += 	"					<span class='tr'>";
				markup += 	"						<span class='td40 h40p blue  vertical-middle align-center'  onclick='[|ONCLICK|]'>";
				markup += 	"							<i class='fa fa-chevron-right'></i>";
				markup += 	"						</span>";	
				markup += 	"					</span>";
				markup += 	"					<span class='tr'>";
				markup += 	"						<span id='delfav_[|FAVTYPE|]_[|FAVID|]' class='favBtn favitem td40 h40p vertical-middle align-center red ' tipptype='[|TIPPTYPE|]' datatext='[|TEXT|]' dataname='[|HEADLINE|]' datatype='[|FAVTYPE|]' rel='[|FAVID|]' >";
				markup += 	"							<i class='fa fa-trash'></i>";
				markup += 	"						</span>";
				markup += 	"					</span>";
				markup += 	"				</span>";							
				markup += 	"			</div><div class='td5'></div>";						
				markup += 	"		</div>";						
				markup += 	"	</div>";		
				markup += "</li>";
							
				return markup;
			},
			commentitem:function(extrainfo){
			
			},
			tippitem:function(extrainfo){
				var markup = "";
				markup += "<li id='tippElem[|ID|]' class='tipps  btn tippElem ' style='width:[|WIDTH|]px;'>"; 
				markup += "	  <div class='tippsImage lazy width100' rel='[|IMAGEID|]' imgname='[|IMAGENAME|]' imgusr='[|IMAGEUSER|]'>";				                      
				markup += "	  </div>";
				markup += "	  <div class='tippsShader content-box white-bg-t8'>";				                      
				markup += "	  </div>";
				//Top
				markup += "   <div class='table' style='position:absolute;top:0;left:0;z-index:3;'>";
				markup += "   		<div class='tr'>";
				markup += "   			<div class='td h40p align-left vertical-top optionsFunc' rel='[|ID|]' tipptype='[|TYPE|]'>";
				markup += "   				<span class='tippsDate small darkgray'>";
				markup += "   					[|DATETIME|]";
				markup += "   				</span>";				
				markup += "	  			</div>";
				markup += "   			<div class='td80 align-right vertical-middle'>";
				markup += "   				<div class='table'>";
				markup += "   					<div class='tr'>";
				markup += "   						<div class='td40 h40p align-center vertical-middle btn action auth favBtn blue ' rel='[|ID|]' datatype='tipp' dataname='[|NAME|]' datatext='[|SHORTDESC|]' tipptype='[|TYPE|]' style='position:relative;top:0;left:0;z-index:9;'>";
				markup += "   							<i class='vertical-middle w40p fa fa-heart'></i>";
				markup += "	  						</div>";
				markup += "   						<div class='td40 h40p align-center vertical-middle shareBtn blue  ' rel='[|ID|]' tipptype='[|TYPE|]' style='position:relative;top:0;left:0;z-index:9;' onclick='helper.share(&quot;[|SHORTDESC|]&quot;, &quot;[|NAME|]&quot; ,&quot;[|IMGURL|]&quot;, &quot;[|LINKURL|]&quot;);'>";
				markup += "   							<i class='vertical-middle w40p fa fa-share-alt'></i>";
				markup += "	  						</div>";
				markup += "	  					</div>";
				markup += "	  				</div>";				
				markup += "	  			</div>";
				markup += "	  		</div>";
				markup += "	  </div>";
				//Middle
				markup += "   <div class='table optionsFunc' rel='[|ID|]' tipptype='[|TYPE|]' style='position:relative;top:10px;left:0;z-index:2;'>";
				markup += "   		<div class='tr'>";
				markup += "   			<div class='td h150p vertical-middle align-center'>";               
				markup += "					<span class='tippsHead darkgray'>[|NAME|]</span>"; 
				markup += "					<span class='tippsSubhead darkgray'>[|INFONAME|]</span>";  				
				markup += "	  			</div>";
				markup += "	  		</div>";
				markup += "	  </div>";
				//Bottom
				markup += "   <div class='table optionsFunc' rel='[|ID|]' tipptype='[|TYPE|]' style='position:relative;bottom:0;left:0;z-index:2;'>";
				markup += "   		<div class='tr'>";
				markup += "   			<div class='td h40p vertical-bottom align-justify'>";   
				markup += "       			<div class='tippsBottom darkgray'>";  
				markup += "						[|SHORTDESC|]"; 
				markup += "       			</div>";				
				markup += "	  			</div>";
				markup += "	  		</div>";
				markup += "	  </div>";
				markup += "</li>";  
				
				return markup;
			},
			websharing:function(extrainfo){
				var markup = "";
				
				markup += "<div class='tippOptions table' id='shareOptions'>";
				markup += "  <a class='tr btn darkgray' href='mailto:?subject=[|SUBJECT|]&amp;body=[|MESSAGE|]%20%20[|LINK|]' target='_blank'>";
				markup += "    <span class='td tippShareBrowser vertical-middle'>";
				markup += "       Email";
				markup += "    </span>";
				markup += "    <span class='td tippShareBrowser align-center btn-icon'>";					
				markup += "      <i id='shareEM' class='btn fa fa-envelope'></i><br>";	
				markup += "    </span>";				
				markup += "  </a>";
				markup += "  <a class='tr btn darkgray' href='https://twitter.com/intent/tweet?text=[|SUBJECT|]&amp;url=[|LINK|]&amp;via=AppHOF' target='_blank'>";
				markup += "    <span class='td tippShareBrowser vertical-middle'>";
				markup += "       twitter";
				markup += "    </span>";
				markup += "    <span class='td tippShareBrowser align-center btn-icon'>";
				markup += "      <i id='shareTW' class='btn fa fa-twitter'></i><br>";	
				markup += "    </span>";				
				markup += "  </a>";
				markup += "  <a class='tr btn darkgray' href='http://www.facebook.com/sharer/sharer.php?u=[|LINK|]' target='_blank'>";
				markup += "    <span class='td tippShareBrowser vertical-middle'>";
				markup += "       facebook";
				markup += "    </span>";
				markup += "    <span class='td tippShareBrowser align-center btn-icon'>";				
				markup += "      <i id='shareFB' class='btn fa fa-facebook'></i><br>";
				markup += "    </span>";				
				markup += "  </a>";
				markup += "  <a class='tr btn darkgray' href='https://plus.google.com/share?url=[|LINK|]' target='_blank'>";
				markup += "    <span class='td tippShareBrowser vertical-middle'>";
				markup += "       Google+";
				markup += "    </span>";
				markup += "    <span class='td tippShareBrowser align-center btn-icon'>";					
				markup += "      <i id='shareGP' class='btn fa fa-google-plus'></i><br>";	
				markup += "    </span>";				
				markup += "  </a>";
				markup += "  <a class='tr btn darkgray' href='http://pinterest.com/pin/create/button/?url=[|LINK|]&amp;description=[|SUBJECT|]&amp;media=[|IMAGE|]' target='_blank'>";
				markup += "    <span class='td tippShareBrowser vertical-middle'>";
				markup += "       pinterest";
				markup += "    </span>";
				markup += "    <span class='td tippShareBrowser align-center btn-icon'>";				
				markup += "      <i id='sharePI' class='btn fa fa-pinterest'></i><br>";
				markup += "    </span>";				
				markup += "  </a>";
				markup += "  <a class='tr btn darkgray' href='https://www.xing-share.com/app/user?op=share;sc_p=xing-share;url=[|LINK|]' target='_blank'>";
				markup += "    <span class='td tippShareBrowser vertical-middle'>";
				markup += "       XING";
				markup += "    </span>";
				markup += "    <span class='td tippShareBrowser align-center btn-icon'>";				
				markup += "      <i id='shareXI' class='btn fa fa-fw fa-xing'></i><br>";
				markup += "    </span>";				
				markup += "  </a>";
				markup += "  <a class='tr btn darkgray' href='http://www.linkedin.com/shareArticle?mini=true&amp;url=[|LINK|]&amp;title=[|SUBJECT|]&amp;summary=[|MESSAGE|]&amp;source=AppHOF' target='_blank'>";
				markup += "    <span class='td tippShareBrowser vertical-middle'>";
				markup += "       linkedin";
				markup += "    </span>";
				markup += "    <span class='td tippShareBrowser align-center btn-icon'>";				
				markup += "      <i id='shareLI' class='btn fa fa-linkedin'></i>";
				markup += "    </span>";			
				markup += "  </a>";
				markup += "</div>";
				
				return markup;
			}
		},
		getlocationparams:function(locItem){
			var item=locItem;
			
			var opening = "<i class='fa fa-clock-o'></i>&nbsp;"  + item.OpeningHours;
			
			var hasWeb = "";
			var webshort ="";
			if(item.Web && item.Web != "" && item.Web != " " && item.Web != "  "){
				/* fix for InAppBrowser Issue on PG Build */							
				webshort = item.Web.replace(/\s+/g, '');
				if (  helper.text.left(webshort,5).toLowerCase() == "http:"  ){
					// nothing to change
				}
				else if ( helper.text.left(webshort,4).toLowerCase() == "www." ){
					webshort = "http://" + webshort;   
				}
				else {
					// no valid URL prefix here ... so add http:
					webshort = 'http://' + webshort;   
				}  
				hasWeb = "<i class='btn w30p h30p vertical-middle align-center fa fa-globe green-bg white block' style='margin:3px 0 0 3px; z-index: 12; position: absolute; top: 0px; font-size: 1em; left: -10px;line-height:30px;'></i>";
			}
			
			var statuscolor = "";
			if($("#menu-admin").hasClass("hidden") == false){	
				if(item.Wert9 == 2){ //Friend
					statuscolor = " yellow-bg darkgray ";
				}
				else if(item.Wert9 == 3){ //Seller
					statuscolor = " green-bg white ";
				}
				else if(item.Wert9 == 50){ //Self
					statuscolor = " green-bg white ";
				}
				else if(item.Wert9 == 80){	// noInfo
					statuscolor = " orange-bg white ";
				}
				else if(item.Wert9 == 99){ // noCall
					statuscolor = " red-bg white ";
				}
				else{ // not editied or verified 
					statuscolor = " darkgray-bg white ";
				}
					
			}
			
			var datastatus = "";
			var datacolor=""
			if(item.Wert9 == 2 || item.Wert9 == 3 || item.Wert9 == 50){ //Self
					datastatus = 
					datastatus = "Aktualisiert<br>" + item.Extra3 + "&nbsp;&nbsp;<i class='fa fa-check-square-o xsmall'></i>";
					datacolor = " green ";
					datastatus = "<span class='datastatus align-center tooltip " + datacolor + "' title='Eintrag aktualisiert: " + item.Extra3 + "' >";
					datastatus += "<i class='fa fa-check-square-o'></i>";
					datastatus += "</span>";
				}
				else if(item.Wert9 == 80){	// noInfo
					/*datastatus = "";
					datacolor = " orange ";*/
				}
				else if(item.Wert9 == 99){ // noCall
					/*datastatus = "";
					datacolor = " red "*/
				}
				else{ // not editied or verified 
					/*datastatus = "";
					datacolor = " lightgray ";*/
				}
				
				
			var typeicon = "";
			var typeicontext = "";
			var locType = item.LocationType;
			switch(locType){
				case 1:
					typeicon = " flaticon-home82 blue ";
					typeicontext = "AB HOF";	
					break
				case 2:
					typeicon = " flaticon-entertaining3 orange ";
					typeicontext = "MARKT";
					break
				case 3:
					typeicon = " flaticon-person92 lightgray ";
					typeicontext = "AKTIVITÄT";
					break
				default:
					typeicon = " ";
					typeicontext = "SONSTIGES";
					break
			}
				
			var cert = "";
			// "Mascherl"
			if (item.Wert5 == 1){
				// 001 = 1 -> Bio
				cert="<span class='cert cert1 blue tooltip' title='Dieser Betrieb ist ein Bio-Betrieb' ><i class='fa fa-leaf'></i><br>BIO</span>";
				
			}
			else if (item.Wert5 == 2){
				// 010 = 2 -> Demeter
				cert="<span class='cert cert2 blue tooltip' title='Dieser Betrieb ist ein Demeter-Betrieb'><i class='fa fa-leaf'></i><br>DEMETER</span>";
			}
			else{
				//000 or NULL -> none
				cert="";
			}
			
			// Features (Lieferung, Markt, Gastro Hofladen)
			var features = ""
			if (item.Wert1 == 1){
				// 1 -> Hofladen
				features += "<span class='locFeature featureShop tooltip' title='Hofladen'><i class='flaticon-store1 blue block align-center vertical-middle'></i></span>";				
			}
			if (item.Wert3 == 1){
				// 3 -> Gastro
				features += "<span class='locFeature featureGastro tooltip' title='Gastronomie'><i class='flaticon-restaurant50 blue block align-center vertical-middle'></i></span>";				
			}
			if (item.Wert2 == 1){
				// 2 -> Lieferung
				features += "<span class='locFeature featureDelivery tooltip' title='Lieferservice'><i class='flaticon-black331 blue block align-center vertical-middle'></i></span>";				
			}
			if (item.Wert4 == 1){
				// 4 -> Märkte
				features += "<span class='locFeature featureMarket tooltip' title='Auch auf Märkten vertreten'><i class='flaticon-entertaining3 blue block align-center vertical-middle'></i></span>";				
			}			
			
			
			var categorysList = "";
			if(item.Categorys && item.Categorys != "" && item.Categorys != " " && item.Categorys != "  " && item.Categorys != "0"){
					categorysList += "<div class='table'><div class='tr'>";
						var Cats = item.Categorys.split(",");
						Cats = helper.array.killduplicates(Cats);
						Cats = Cats.sort(alphabetical);						
						$.each(Cats, function(){
							var catID=this;
							if (catID > 0 && catID < 9999){						
							var catInfo = helper.getObjItem(app.obj.categorys,"ID",catID);
								if (catInfo){		
									categorysList += "	<div class='td30 vertical-top align-left tooltip' title='" + catInfo.Name + "'>";									
										categorysList += app.markup.get("catlistitem",{color:catInfo.Background, name:catInfo.Name,icon:catInfo.Icon});
									
									categorysList += "	</div>";
								}
							}
						});	
						categorysList += "	<div class='td vertical-top align-left'>&nbsp;</div>";// empty col to span the rest of the row and prevent stretching the icon cells
					categorysList += "</div></div>";	
			}
			
			var dist = helper.gps.calc.distance(parseFloat(item.CenterLat), parseFloat(item.CenterLon), helper.gps.lat,helper.gps.lon,"car");
			
			// distance factor for sorting
			var sortdist = parseInt(dist*100);
			
			if( dist != "NaN" && dist != "" && dist != " "){					
				dist = "<div>~" + dist + "km</div>";
			}
			else{
				dist = ""
			}
									
			var votings = app.voting.markup.build("",item.VotingAvg,item.VotingCount,true);
			var comments = app.comment.markup.getSum("",0,0, true, item.CommentCount);
						
			var result = {id:item.ID,sort:sortdist,statuscolor:statuscolor,icon:typeicon,icontext:typeicontext,name:item.Name,opening:opening,zip:item.Zip,city:item.City,address:item.Address,type:locType,categorys:categorysList,distance:dist,url:webshort,votings:votings,comments:comments, hasWeb:hasWeb, cert:cert, datastatus:datastatus, datacolor:datacolor,features:features };
			
			return result;
		}
	},
	menu: {
		userinfo: function(){
			if (typeof(app.auth) == "undefined" || app.auth == '' || app.auth == 'anonymous'){
				$("#menu-user-image").attr("src", "img/no_avatar.gif");
				$("#settings-user-image").attr("src", "img/no_avatar.gif");
				$("#menu-user-name").text("nicht angemeldet");
				// hide logout, show login
				$("#menu-login").removeClass("hidden");
				$("#menu-register").removeClass("hidden");
				$("#menu-logout").addClass("hidden");
			}
			else{
				if (app.obj.user.UserID != 'undefined' && app.obj.user.UserID != undefined){
					$("#menu-user-image").attr("src", app.imageUserURL + "&userId=" + app.obj.user.UserID + "&h=100&_=" + helper.datetime.actual.time());
					$("#settings-user-image").attr("src", app.imageUserURL + "&userId=" + app.obj.user.UserID + "&h=100&_=" + helper.datetime.actual.time());
					$("#menu-user-name").text(app.obj.user.DisplayName);
					// hide login, show logout
					$("#menu-login").addClass("hidden");
					$("#menu-register").addClass("hidden");
					$("#menu-logout").removeClass("hidden");
				}
				else{
					$("#menu-user-image").attr("src", "img/no_avatar.gif");
					$("#settings-user-image").attr("src", "img/no_avatar.gif");
					$("#menu-user-name").text("nicht angemeldet");
					// hide logout, show login
					$("#menu-login").removeClass("hidden");
					$("#menu-register").removeClass("hidden");
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
	menuKeyDown:function(){
		app.menu.toggle();
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
			
            // set page title to selected page´s pghead tag and footer to help text
            app.page.setTitle(pageTitle);
            app.page.setHelp(pageName);
			
            // hack for the map to show up correctly, because hidden map will not update properly
            if(pageName == "map"){
                if (map){
					var mapHeight = (helper.screen.height -40) + "px";
					$("#mapPanel").css("height",mapHeight);
					$("#map").css("height",mapHeight);
					app.map.refresh();
                }
            } 
			else if(pageName == "fav"){
				if(app.authstate==true){
					app.fav.update();
				}
			}
			else if(pageName == "settings"){
				helper.settings.load();
			}
			else if(pageName == "search"){
				// repeat search if there is a searchword but no results in list
				if($("#searchMain").val() != "" && $("#searchList li").length == 0){
					app.search.now($("#searchMain").val());
				}
				$("input#searchMain").focus();
			}
        },
        setTitle: function(theTitle){
            $("#top-title").text(theTitle);			
        },
		setHelp: function(pageName){		
			$("#help-button").off("click");
			$("#help-button").on("click",function(){
				app.page.showHelp(pageName);
			});
		},
		showHelp:function(pageName){
			var fullHelpText = $("#helptext-full span[rel='" + pageName + "']").html();
			helper.popup.show(  
				"Hilfe" ,                                        // overlay title
				fullHelpText,     // overlay textarea
				'fa fa-question',
				false,false,function(){},function(){}                    
			);
		}		
    },
	screenChange:function(){
		helper.screen.height = helper.screen.check.height();
        helper.screen.width = helper.screen.check.width();
        
		app.map.refresh();
	},
	search:{
		now: function(searchstring){
				// respect nearme radius depending on users position
				var options =  {};
				if ($("#chkSearchNear").prop('checked')){
					var radiusToShow = helper.settings.get("Radius");
					// load locations in radius
					if (radiusToShow < 1){
						var defaultRadius = $('input[rel="Radius"]').attr("default-value");
						radiusToShow = parseInt(defaultRadius); // always shows 50% more distance ???
					}
					var uLat = (helper.gps.lat);
					var uLon = (helper.gps.lon);
					options = {'n': 20, 's': searchstring, 'lat': uLat, 'lon': uLon, 'dist':radiusToShow.toString()};
				}
				else{
					options = {'n': 20, 's': searchstring};
				}
				
				//get the data and handle callback				
				helper.spinner.show(false,true);
                helper.dataAPI("getSuggest","no", options, function(err,data){ 
                    if(!err){
						$("#searchList").empty();
						var suggestions = "";		
						$.each(data, function(){
							var item = this;
							var icon = "";
							var icontext = "";
							var text="";
							var onclick="";
							switch(item.ObjectTypeID){
								case '5': 								
									if (item.LocationType == 1){
										icon = 		" location-icon flaticon-home82 blue ";
										icontext =  "<div class='small blue'>AB HOF</div>";
										text = 		item.InfoExtra;
									}
									else if (item.LocationType == 2){
										icon = 		" location-icon flaticon-entertaining3 orange ";
										icontext =  "<div class='small orange'>MARKT</div>";
										text = 		item.InfoExtra;
									}
									else if (item.LocationType == 3){
										icon = 		" location-icon flaticon-person92 darkgray ";
										icontext =  "<div class='small green'>AKTIVITÄT</div>";
										text = 		item.InfoExtra;
									}
									else{
										icon = " fa fa-question "
										icontext = "<div class='small lightgray'>SONSTIGE</div>";
										text = 		item.InfoExtra;
									}
									var dist = helper.gps.calc.distance(parseFloat(item.CenterLat), parseFloat(item.CenterLon), helper.gps.lat,helper.gps.lon,"car");
									
									icontext += "<div class='xsmall'>";
									if( dist != "NaN" ){
										icontext += "~" + dist + "km";
									}
									else{
										icontext += "";
									}
									icontext += "</div>";
									
									onclick = 	"app.location.details.show(" + item.ObjectID + ");";
									break;        
								case '6': 
									icon = 		" fa fa-thumb-tack ";
									icontext = "<div class='small lightgray'>Tipp</div>";
									text = 		item.InfoDescShort;		
									var tipptype = '"TIPP"';
									onclick = 	"app.tipp.details(" + item.ObjectID + "," + tipptype + ");";
									break;        
									
								case '62': 
									icon = 		"fa fa-newspaper-o";
									icontext = "<div class='small lightgray'>BLOG Artikel</div>";
									text = 		item.InfoDescShort;		
									var tipptype = '"BLOG"';
									onclick = 	"app.tipp.details(" + item.ObjectID + "," + tipptype + ");";
									break;        
								default:
									icon = 	"";
									icontext = "";
									text = 		item.InfoDescShort;		
									onclick = 	"";
									break;
							}
							suggestions += app.markup.get("searchitem",{"onclick":onclick,icon:icon,icontext:icontext,name:item.Name,text:text, dist:dist});
						});
						$("#searchList").append(suggestions);
						
						// sort list by distance
						var $searchLIST = $('#searchList');
						var $searchLISTli = $searchLIST.children('li');

						$searchLISTli.sort(function(a,b){
							var an = parseInt(a.getAttribute('sort')),
								bn = parseInt(b.getAttribute('sort'));

							if(an > bn) {
								return 1;
							}
							if(an < bn) {
								return -1;
							}
							return 0;
						});

						$searchLISTli.detach().appendTo($searchLIST);

						
						$(".ellipsis").ellipsis();
						helper.spinner.hide();
					}
                    else{
                        helper.errorLog(err);
                    }
                });
		}
	},
	// special settings page functions
	settings:{
		products:function(){
			// nutrition = vg,vgto,vgtl,fru,pes,lac,alc
			// sel = true -> selected, sel = false -> not selected
			var nutrition = $("#nutritionSelect").val();
			var selector = "#settingsCategorys input[type=checkbox]";
		
			// select all
			$("#settingsCategorys input[type=checkbox]").prop("checked",true);
			if( nutrition != "all"){
				selector += "[" + nutrition + "='n']";
				var theElements = $(selector);
				//  unselect not appropriate items
				$.each(theElements,function(){
					var theElem = $(this);
					theElem.prop("checked",false);
				});
			}
			
			// unselect lac and alc if they should not show up
			var showALC = $("#settingsNutrition input[rel='NutritionALC']").prop("checked");
			var hideLAC =$("#settingsNutrition input[rel='NutritionLAC']").prop("checked");
			selector = $("#settingsCategorys input[type=checkbox]");
			$.each(selector,function(){
				var theElem = $(this);
				if (theElem.prop("checked")){
					if (theElem.attr("alc") == "y" && showALC == false){
						theElem.prop("checked", false)
					}
					if (theElem.attr("lac") == "y" && hideLAC == true){
						theElem.prop("checked", false)
					}
				}
			});
		}
	},
	// tipp functions     ##### TODO FROM HERE (SORT CODE AND REVIEW)
    tipp:{
		shareURL: "http://apphof.at/tipps/ti/",
		shareURLblog: "http://apphof.at/blog/id/",
		newscount: 0,
		blogscount: 0,
		newsact: 1,
		blogsact: 1,
		load:function(tippID,returnData,buildList){
			var itemID = 0;
			if (typeof(tippID) != "undefined"){		
				try {
					itemID = parseInt(tippID);
				} 
				catch (e) {
					itemID = 0;
				} 
			}
			if (typeof(returnData) == "undefined"){
				returnData = false;
			}
			if (typeof(buildList) == "undefined"){
				buildList = true;
			}
			
			// respect users preferences for tipps he/she wants to receive 
			// and the specified area(s)
			//get the data and handle callback 
			// respect "trashed" tipps -----------------------------  TODO ###############################################################
			// respect location centric tipps (lat/lon) ------------  TODO ###############################################################
			
			var objecttypeID = 0;
			helper.dataAPI("getData","blogs_tipps", {'i': itemID, 'o':objecttypeID},function(err,dataset){
			   if(!err){
					app.obj.tipps = dataset;
					if(buildList){
						app.tipp.list("tippsList","box","TIPP",1);						
						app.tipp.list("tippsListFull","box","TIPP",0,true);
						
						app.tipp.list("blogsList","box","BLOG",1);
						app.tipp.list("blogsListFull","box","BLOG",0,true);						
					}
					if(returnData){
						return dataset;
					}
			   }
				else{
					helper.errorLog(err);
				}
            });
		},
        // get markup for most recent tipps - with lazy load - "wrapperID" is the id of the element that should hold the list
		list: function(wrapperID, style, tipptype, max, dontRotate){
			var dataset = app.obj.tipps;
			var markup = "";
			var counter = 0;
			$.each(dataset,function(){
				var data = this;  
				if (data.Type == tipptype){	
					markup += app.tipp.listitem(data);
					counter++;				
				}				
			});     
		
			markup = markup.replace(/null/g,'');
			
			// add list to wrapper
			$("#" + wrapperID ).html(markup);

			// if available - update counter:
			if (tipptype == "BLOG"){
				app.tipp.blogscount = counter;
				$("#" + wrapperID + "Counter" ).html(counter);			
			}
			else if (tipptype == "TIPP"){
				app.tipp.newscount = counter;
				
				$("#" + wrapperID + "Counter" ).html(counter);
				
				if (counter == 0){
					$("#home-tipps-box").hide();
				}
				else{
					$("#home-tipps-box").show();
				}
				
			}
			
			// change order to "newest on top"
			//helper.control.ul.reverse($("#" + wrapperID));	

			if (typeof(max) != "undefined" && max > 0){
				// remove all that are more than max
				max--;
				$("#" + wrapperID + " li:gt(" + max + ")").addClass("hidden");
			}	
			setTimeout(function(){
				// update default-images with the correct ones
				var theWrapperID = wrapperID;
				helper.image.update(theWrapperID);		
				
				// update optionbuttons click handler - now used for read more ...
				var selector = $("#" + theWrapperID + " .optionsFunc");
				$.each(selector, function(){
					var sel = $(this);
					sel.off('click');
					sel.on("click",function(){	
						app.tipp.details(sel.attr("rel"),sel.attr("tipptype"));
						//app.tipp.options.popUp(sel.attr("rel"),sel.attr("dataname"),sel.attr("tipptype"));
					});
				});
								  
				// set click handler to the buttons
				
				selector = $("#" + theWrapperID + " .favBtn");
				$.each(selector, function(){
					var sel = $(this);
					sel.off('click');
					sel.on("click",function(){
						app.fav.toggle(sel, sel.attr("datatype"), sel.attr("rel"), sel.attr("dataname"),sel.attr("datatext"), sel.attr("tipptype") );
					});
				});
				
				var theWrapper = $("#" + theWrapperID);
				theWidth = theWrapper.find("li:first").width();
				
				// set width of the list to all elements width 
				var tippListCount = $("#" + theWrapperID + " li").length;
				var tippListWidth = (tippListCount * theWidth) + (tippListCount * 2);
				theWrapper.css("width", tippListWidth + "px");
				
				// set rotation on the elements of the wrapper
				if(dontRotate && dontRotate == true){
					// dont set rotation
				}
				else{
					setInterval(function(){app.tipp.rotate(theWrapper)}, 8000);
				}							
				// update favs
				app.fav.update();				
			},500);						
        },
		listitem: function(data){
			// calc li width
			var liWidth = 300;
			var screenWidth = helper.screen.width;
			if ( screenWidth <= 679){
				liWidth = parseInt(99 * (screenWidth/100));
			}
			else if ( screenWidth <= 1024){
				liWidth = parseInt(49.5 * (screenWidth/100));
			}
			else if ( screenWidth <= 1399){
				liWidth = parseInt(33 * (screenWidth/100));
			}
			else {
				liWidth = parseInt(24.5 * (screenWidth/100));
			}
			var imgID = 0;
			var imgNAME = "";
			var imgUSER = "";
			if (data.ImageID != 0){
				imgID = data.ImageID;
				imgNAME = "";
				imgUSER = "0";
			}
			else{
				imgID = "0";
				imgNAME = data.ImageName;
				imgUSER = data.UserID;
			}
			
				if (data.Type == "BLOG"){
					var imgurl = app.blogURL + "/" + data.UserID + "/med_" + data.ImageName;
					var linkurl = app.tipp.shareURLblog + data.ID;
				}
				else{
					var imgurl = app.imageURL + "?File=IMG/" + data.ImageName ;
					var linkurl = app.tipp.shareURL + data.ID;
				}
					
			var markup = app.markup.get("tippitem",{
					id:data.ID, 
					type:data.Type,
					width:liWidth,
					datetime:helper.datetime.fromDate.dateShort( data.DateCreated ),
					shortdesc:data.InfoDescShort,
					name:data.Name,
					infoname:data.InfoName,
					imageid:imgID,
					imageuser:imgUSER,
					imagename:imgNAME,
					imgurl:imgurl,
					linkurl:linkurl					
				});				
			return markup;
		},
		options:{
			popUp: function(tippID, tippTitle, tipptype){
				var markup = "";
				markup += "<div class='tippOptions table' id='tippOptions'>";
				markup += "  <div class='tr'>";
				markup += "    <span class='td tippDetails vertical-middle'>";
				markup += "      Details zu diesem Tipp";
				markup += "    </span>";
				markup += "    <span class='td tippDetails align-center vertical-middle btn-icon'>";
				markup += "      <i class='btn fa-fa-info'></i>";
				markup += "    </span>";
				markup += "  </div>";
				markup += "  <div class='tr'>";
				markup += "    <span class='td tippMap vertical-middle'>";
				markup += "      Auf der Karte zeigen";
				markup += "    </span>";
				markup += "    <span class='td tippMap align-center vertical-middle btn-icon'>";
				markup += "      <i class='btn fa fa-map-marker'></i>";
				markup += "    </span>";
				markup += "  </div>";
				markup += "  <div class='tr'>";
				markup += "    <span class='td tippShare vertical-middle'>";
				markup += "      Diesen Tipp teilen";
				markup += "    </span>";
				markup += "    <span class='td tippShare align-center vertical-middle btn-icon'>";
				markup += "      <i class='btn fa fa-share-alt'></i>";
				markup += "    </span>";
				markup += "  </div>";
				markup += "</div>";
				
				helper.popup.show('Optionen',                                      
									markup,     
									'fa fa-align-justify',
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
				
				app.tipp.options.bind(tippID,tippTitle, tipptype);
			},
			bind:function(tippID,tippTitle, tipptype){
				// bind functions to the options-buttons
				if( $("#tippOptions").length > 0 ){
					// its already there - get data for the tipp
					
					// find the elements and bind functions to the options
					var tippDetails = $("#tippOptions .tippDetails");
					tippDetails.off('click');
					tippDetails.on("click",function(){
						app.tipp.details(tippID, tipptype);
					});
					var tippMap = $("#tippOptions .tippMap");
					tippMap.off('click');
					tippMap.on("click",function(){
						app.tipp.map(tippID);
					});
					//if( $("#tippOptions .tippShare").length > 0 ){
						var tippShare = $("#tippOptions .tippShare");
						tippShare.off('click');
						tippShare.on("click",function(){
							helper.share("TestMessage", "TestSubject" ,"http://in-u.at/Portals/0/inuLogoWEB.png", "http://in-u.at");
						});						
					/*}
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
					}*/
				}
				else{
					var theTippID = tippID;
					var thetipptype = tipptype;
					// delay this function
					setTimeout(function(){
						app.tipp.options.bind(theTippID, thetipptype);
					},helper.retryTimeOut);
				}
			}
		},
		details:function(tippID, tipptype){
			// check what kind of tipp this is and what to show as details
			var dataType = ""
			switch(tipptype){
				case 'TIPP': 
					dataType = "tipps"
					break;    
				case 'BLOG': 
					dataType = "blogs"
					break;        
				default:
					alert("undefined tipptype");
					break;
			}
			/*			"seller" -> 1,
                        "product" -> 2,
                        "sellerproduct" -> 3,
                        "category" -> 4,
                        "location" -> 5,
                        "tipp" -> 6,
			*/
			helper.dataAPI("getData",dataType, {'i': tippID, 'o': 0},function(err,dataset){ 
				if(!err){
					var data = dataset[0];	
					var thetipptype = tipptype;
					var markup = ""
					//markup += "	<div class='page-inner'>";
					//markup += "		<div class='page-content'>";
					markup += "			<div class='table'>";
					markup += "				<div class='tr'>";
					markup += "					<span class='apponly detailBtn td vertical-middle align-left darkgray ' onclick='app.tipp.location(" + data.ID + ");'>";
					markup += helper.datetime.fromDate.dateShort( data.DateCreated );
					markup += "					</span>";
					markup += "					<span class='apponly favBtn td40 h40p vertical-middle align-center btn action auth favBtn blue ' rel='" + data.ID + "' tipptype='" + thetipptype + "'  datatype='tipp' onclick='app.fav.toggle($(this), " + '"tipp"' + ", " + data.ID + ", " + '"' + data.InfoDescShort +  '"' + ", " + '"' + data.Name +  '"' + ", " + '"TIPP"' + ");'>";
					markup += "						<i class='vertical-middle w40p fa fa-heart'></i>";
					markup += "					</span>";
					
					var message = data.InfoDescShort;
					var subject = data.Name;
					var image = app.imageURL + "?File=IMG/" + data.ImageName ;
										
					var link = app.tipp.shareURL + tippID;
					
					if (tipptype == "BLOG"){
						link = app.tipp.shareURLblog + tippID;
						image = app.blogURL + "/" + data.UserID + "/med_" + data.ImageName;
					}
				
					markup += "					<span class='apponly shareBtn td40 h40p vertical-middle align-center blue ' onclick='helper.share(&quot;" + message + "&quot;, &quot;" + subject + "&quot;, &quot;" + image + "&quot;, &quot;" + link + "&quot;);'>";
					markup += "						<i class='vertical-middle w40p fa fa-share-alt'></i>";
					markup += "					</span>";
					
					if (tipptype == "TIPP"){
						markup += "					<span class='apponly detailBtn td40 h40p vertical-middle align-center blue ' onclick='app.tipp.map(" + data.ID + ");'>";
						markup += "						<i class='vertical-middle w40p fa fa-map-marker'></i>";
						markup += "					</span>";
						markup += "					<span class='apponly detailBtn td40 h40p vertical-middle align-center blue ' onclick='app.tipp.location(" + data.ID + ");'>";
						markup += "						<i class='vertical-middle w40p fa fa-chevron-right'></i>";
						markup += "					</span>";
					}
					markup += "				</div>";
					markup += "			</div>";
					markup += "			<img width='100%' src='" + image + "' />";
					markup += "			<h2 class='nomargin'>" + data.Name + "</h2>";
					markup += "			<h4>" + data.InfoName + "</h4>";
					markup += "			<div id='mainArticle'>";
					markup += "				" + $('<textarea />').html(data.InfoDescLong).text();
					markup += "			</div>";
					markup += "			<div class='table'>";
					markup += "				<div class='tr'>";
					markup += "					<div class='td'>";
					markup += "				"
					markup += "					</div>";
					markup += "					<div class='td'>";
					markup += "				"
					markup += "					</div>";
					markup += "					<div class='td'>";
					markup += "				"
					markup += "					</div>";
					markup += "				</div>";
					markup += "			</div>";
					
					//markup += "		</div>";
					//markup += "</div>";
					
					if (tipptype == 'TIPP'){
						switch(data.ObjectTypeID){
							case 1: 
								//app.seller.show(data.ObjectID);
								break;        
							case 2: 
								//app.product.show(data.ObjectID);
								break;        
							case 3: 
								//app.seller.product.show(data.ObjectID);
								break;        
							case 4: 
								//app.category.show(data.ObjectID);
								break;        
							case 5: 
								//app.location.details.show(data.ObjectID);
								//app.tipp.show(data.ObjectID);
								// tipp element details to show
								
								
								var imgURL = helper.image.geturl(data.ImageID,function(imageURL){
									markup = markup.replace("[IMAGEURL]",imageURL);
										
									helper.popup.show('Details',                                      
												markup,     
												'fa fa-thumb-tack',
												false,
												false,
												function(){// callback from OK button (hidden)
												},                       
												function(){// callback from CANCEL button
												} 
									);
									app.fav.update();
									//onclick='event.preventDefault();window.open(&quot;https://plus.google.com/103220114702872906165&quot;,&quot;_system&quot;);'
									$.each($("#mainArticle a[target='_blank']"),function(){
										var theLink = $(this);
										var theHREF = theLink.attr("href");
										theLink.attr("onclick","event.preventDefault();window.open(&quot;" + theHREF + "&quot;,&quot;_system&quot;);");
										theLink.attr("href","#");
									});
								});
								
								break;        
							case 6: 
								app.tipp.details(data.ObjectID);
								break;        
							default:
								alert("undefined objectTypeID");
								break;
						}
					}
					else if (tipptype == 'BLOG'){
						// classified details to show
						/*var markup = "<div class='page-inner'>";
						markup += "<div class='page-content'>";
						markup += "<img width='100%' src='" + app.blogURL + "/" + data.UserID + "/med_" + data.ImageName + "' />";
						markup += "	<h1>" + data.Name + "</h1>";
						markup += "	<h2>" + data.InfoName + "</h2>";
						markup += "	<div>";
						markup += "		" + $('<textarea />').html(data.InfoDescLong).text();
						markup += "	</div>";
						markup += "</div>";
						markup += "</div>";*/
						helper.popup.show('Details',                                      
									markup,     
									'fa fa-thumb-tack',
									false,
									false,
									function(){ 
										// callback from OK button (hidden)									
									},                       
									function(){ 
										// callback from CANCEL button
									} 
						);
						setTimeout(function(){
							app.fav.update();
							//onclick='event.preventDefault();window.open(&quot;https://plus.google.com/103220114702872906165&quot;,&quot;_system&quot;);'
							$.each($("#mainArticle a[target='_blank']"),function(){
								var theLink = $(this);
								var theHREF = theLink.attr("href");
								theLink.attr("onclick","event.preventDefault();window.open(&quot;" + theHREF + "&quot;,&quot;_system&quot;);");
								theLink.attr("href","#");
							});
						},500);
					}
					else{
						alert("undefined tipptype");
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
					switch(data.ObjectTypeID){
						case 1: 
							//app.seller.show(data.ObjectID);
							break;        
						case 2: 
							//app.product.show(data.ObjectID);
							break;        
						case 3: 
							//app.seller.product.show(data.ObjectID);
							break;        
						case 4: 
							//app.category.show(data.ObjectID);
							break;        
						case 5: 
							//data.ObjectID holds location data
							helper.dataAPI("getData","locationdetails", {'i': data.ObjectID},function(err,dataObj){
								if(!err){
									// dataObj holds Locationinfo
									app.page.show("map");
									app.location.details.showMap(dataObj[0].ID);
									/*
									var coordLat = dataObj[0].CenterLat;
									var coordLon = dataObj[0].CenterLon;
									app.map.position.coords.find(coordLat, coordLon,16);
									*/
									helper.popup.hide();
								}
								else{
									helper.errorLog(err);
								}
							});
							break;        
						case 6: 
							app.tipp.details(data.ObjectID);
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
		location:function(tippID){
			helper.dataAPI("getData","tipps", {'i': tippID, 'o': 0},function(err,dataset){ 
				if(!err){
					var data = dataset[0];					
					switch(data.ObjectTypeID){
						case 1: 
							//app.seller.show(data.ObjectID);
							break;        
						case 2: 
							//app.product.show(data.ObjectID);
							break;        
						case 3: 
							//app.seller.product.show(data.ObjectID);
							break;        
						case 4: 
							//app.category.show(data.ObjectID);
							break;        
						case 5: 
							//data.ObjectID holds location data
							helper.dataAPI("getData","locationdetails", {'i': data.ObjectID},function(err,dataObj){
								if(!err){
									// dataObj holds Locationinfo
									app.location.details.show(dataObj[0].ID);
								}
								else{
									helper.errorLog(err);
								}
							});
							break;        
						case 6: 
							app.tipp.details(data.ObjectID);
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
		rotate:function(theWrapper){
			if (theWrapper.children().length > 1){
				theWrapper.find('li:first').addClass("hidden");
				theWrapper.find('li:first').appendTo(theWrapper);
				theWrapper.find('li:first').removeClass("hidden");
			}
		}
	},
	voting: {
	/* getvotings for a specific element as a list - with lazy load
        objecttypeID:    "seller" -> 1,
                        "product" -> 2,
                        "sellerproduct" -> 3,
                        "category" -> 4,
                        "location" -> 5,
                        "tipp" -> 6,
    */
        markup:{
			build:function(wrapperID, valueVotingAvg, valueVotingCount, small){
				var markup = "<span class='votingsum'>";
					if (isNaN(valueVotingAvg) || valueVotingAvg == 0 || valueVotingCount <= 0 ){
						// no number or zero = no voting
						if (typeof(small) != "undefined" && small == true){	
							for (var i = 0; i < 5; i++) {
								markup += "<i class='fa fa-fw fa-star-o lightgray'></i>";
							}
														
							markup += "<span class='votingcount'> ( 0 ) </span>";
						}
						else{
							markup += "<span class='votingcount'>keine Bewertungen</span>";
						}
					}
					else{
						// calculate the stars - and add them to the markup
						var voting = parseFloat(valueVotingAvg);
						var votingFull = Math.floor(voting);
						var count = 0
						for (var i = 0; i < votingFull; i++) {
							markup += "<i class='fa fa-fw fa-star orange'></i>";
							count++;
						}
						var votingDecimal= (voting -votingFull) *100;
						if (Math.floor(votingDecimal) >= 50){
							markup += "<i class='fa fa-fw fa-star-half-o orange'></i>";
							count++
						}
						for (var i = count; i < 5; i++) {
							markup += "<i class='fa fa-fw fa-star-o lightgray'></i>";
						}
						if (typeof(small) != "undefined" && small == true){
							markup += "&nbsp;<span class='votingcount'> ( " + valueVotingCount + " )</span>";
						}
						else{
							markup += "&nbsp;<span class='votingcount'> aus " + valueVotingCount + " Bewertungen</span>";
						}
						
					}  
					markup += "</span>";
					if (wrapperID == ""){
						return markup;
					}
					else{
						$("#" + wrapperID ).html(markup);
					}
			},
            getSum:function(wrapperID, objecttypeID, itemID, small, valueVotingAvg, valueVotingCount){
                //get the data and handle callback
				if(typeof(valueVotingAvg) != "undefined" && typeof(valueVotingCount) != "undefined"){
					// value is provided, no need to get data online
					app.voting.markup.build(wrapperID, valueVotingAvg, valueVotingCount, small);
				}
				else{
					helper.dataAPI("getData","uservotings-c", {'i': itemID, 'o':objecttypeID},function(err,dataset){ 
						if(!err){
							var data = dataset[0];
							valueVotingAvg = data.VotingAvg;
							valueVotingCount = data.VotingCount;
							app.voting.markup.build(wrapperID, valueVotingAvg, valueVotingCount, small);
						}
						else{
							helper.errorLog(err);
						}
					});
				}
            }
        }
    }
};

/**###################################################
				Common Helper Functions
			should be called after deviceready
###################################################### */
var helper = {
	appIsOnline: false,
	appIsMobile: false,
	deviceTimeout:3000,
	deviceState:false,
	firststart:	true,
	retryTimeOut: 500, // timeout for retrying to fetch remote data
	array:{
		killduplicates:function(arr){
			return arr.filter(
				function(a){if (!this[a]) {this[a] = 1; return a;}},
				{}
			);
		}
	},
	check:{
		firststart:function(){
			var first = helper.settings.get("FirstStart");
			if (first === 0 || first === "" || first === " " || first === null || typeof(first) == "undefined"){
				first = true;
			}
			return first;
		},
		mobileapp: function(){
			return (typeof(cordova) !== 'undefined' || typeof(phonegap) !== 'undefined');
			helper.errorLog("isMobileApp");
		},
		online:{
			info:false,
			interval:60000, // check all n miliseconds
			state:function(testurl){
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
					if ( s >= 200 && s < 300 || s === 304 ){
						helper.appIsOnline = true;
						return true;						
					}
					else{
						helper.appIsOnline = false;
						return false;
					}
				} 
				catch (e) {	
					helper.appIsOnline = false;				
					return false;
				}
			}			
		}
	},
	control:{ // select by text or value, reverse ul order
		select:{
			bytext:function(elementID, text){
				$("#" + elementID + " option[text='" + text + "']").prop('selected', 'selected');
			},
			byvalue:function(elementID, value){
				 $("#" + elementID + " option[value='" + value + "']").prop('selected', 'selected');
			}
		},
		ul:{
			reverse:function(jqElemUL){
				var listItems = jqElemUL.children('li');
				jqElemUL.append(listItems.get().reverse()); 
			}
		}
	},
	/** data - local data 
		------------------------------------------- */
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
	/** dataAPI (ajaxPOST) - remote data 
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
	/** date and time helpers (depends on "helper.text.pad")
		dayname expects date in format yyyy-mm-dd
		--------------------------------------------- */
	datetime:{
		actual:{
			dayname:function(datevalue,shortDay){
				var dayNames = new Array(
				  'Sonntag',
				  'Montag',
				  'Dienstag',
				  'Mittwoch',
				  'Donnerstag',
				  'Freitag',
				  'Samstag'
				);
				var dayName = dayNames[datevalue.getDay()];
				if(typeof(shortDay) != "undefined" && shortDay == true){
					dayName = helper.text.left(dayName,2);
				}
				return dayName;
			},
			date:function(){
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
				var dateString = helper.text.pad(monthday, 2) +
								'.' +
								helper.text.pad(monthnumber, 2) +
								'.' +
								year;
				return dateString;
			},
			time:function(){
				var now = new Date();
				var hour = now.getHours();
				var minute = now.getMinutes();
				var second = now.getSeconds();
				var timeString = helper.text.pad(hour,2) +
								':' +
								helper.text.pad(minute,2) +
								':' +
								helper.text.pad(second, 2);
				return timeString;
			},
			datetime:function(){
				return helper.datetime.actual.date() + " " + helper.timeActual();
			},
			datetimeDB:function(){
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
								"-" + helper.text.pad(monthnumber, 2) + 
								"-" + helper.text.pad(monthday, 2) + 
								"T" + helper.text.pad(hour, 2) + 
								":" + helper.text.pad(minute, 2) + 
								":" + helper.text.pad(second, 2) + 
								"." + helper.text.pad(ms, 3);
				return dateString;
			},
			datetimeFile:function(){
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
								"-" + helper.text.pad(monthnumber, 2) + 
								"-" + helper.text.pad(monthday, 2) + 
								"_" + helper.text.pad(hour, 2) + 
								"-" + helper.text.pad(minute, 2) + 
								"-" + helper.text.pad(second, 2);
				return dateString;
			}
		},
		fromDate:{
			dateShort:function(datetimestring){
				var theDate = new Date(datetimestring);
				var now = new Date();
				var result = "";
				if(	theDate.getYear() == now.getYear() && theDate.getMonth() == now.getMonth() && theDate.getDate() == now.getDate()){
					result = "Heute";
				}
				else{		
					var result =  helper.text.pad(theDate.getDate(),2) + "." + helper.text.pad((parseInt(theDate.getMonth()) + 1) ,2) + ".";
					var theYear = 1900 + parseInt(theDate.getYear());
					result += theYear;
				}
				return result;
			},
			timeShort:function(datetimestring){
				var theDate = new Date(datetimestring);
				var now = new Date();
				var result = helper.text.pad(theDate.getHours(),2) + ":" + helper.text.pad(theDate.getMinutes(),2);
				return result;		
			},
			datetimeShort:function(datetimestring){
				var result = helper.datetime.fromDate.dateShort(datetimestring) + " " + helper.datetime.fromDate.timeShort(datetimestring);
				return result;			
			}
		}
	},
	deviceready:function(notmob){
		// start tracking GPS if geolocation supported
		helper.gps.position.get();		
		if(typeof(notmob) != "undefined" && notmob == true && helper.deviceState == false){
			helper.errorLog('device not ready after ' + (helper.deviceTimeout / 1000) + ' seconds...');
			helper.deviceState = false;
			$("#aboutAppOS").html("Smartphones & Tablets");
			$("#aboutAppVersion").html("v.1.0.5.1");
			helper.appIsMobile = false;	
		}else if (notmob == false){
			helper.errorLog('device ready...');	
			helper.deviceState = true;
			$("body").addClass("mobileApp");
			helper.appIsMobile = true;
			// bind menu and back buttons of the device
			document.addEventListener("menubutton", app.menuKeyDown, true);
			document.addEventListener("backbutton", app.backKeyDown, false);
			
			// add device and App Infos in About screen
			$("#aboutDeviceModel").html(device.model);
			app.deviceModel = device.model;
			$("#aboutDeviceOS").html(device.platform);
			app.osName = device.platform;
			
			$("#aboutDeviceVersion").html(device.version);
			app.osVersion = device.version;
			//add versionnumber to the field in about - appversion needs appversion plugin 
			cordova.getAppVersion(function (version) {
				app.version = version;
				$("#aboutAppVersion").html(version);
			});	
			if (app.osName != "iOS"){
				$("body").css("padding-top","20px");
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
				theParameters.DateCreated = helper.datetime.actual.datetimeDB();
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
	form: {
		show: function(fields, withoutLabels){
			if (typeof(withoutLabels) == "undefined" || withoutLabels == false){
				withoutLabels = false;
			}
			
			var markup = "<div id='inputmask' class='inputform'>"; // start form table
			$.each(fields, function(){
				var theField = this;
				markup += "<div class='inputrow'>";  // row start     
				if(withoutLabels == false){
					markup += "<div class='inputlabel'>" + theField.Label + "</div>";
				}
				switch(theField.Control){
					case 'text':
						markup += "<div class='inputcontrol'><input type='text' rel='" + theField.Name + "' value='" + theField.Options.Value + "' ";
						if(withoutLabels == true){
							markup += " placeholder='" + theField.Label + "' ";
						}
						markup += "/></div>";
						break;
					case 'textarea':
						markup += "<div class='inputcontrol'>" + theField.Options.Value + "<textarea cols='40' rows='4' rel='" + theField.Name + "' "						
						if(withoutLabels == true){
							markup += " placeholder='" + theField.Label + "' ";
						}
						markup += "></textarea></div>";
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
					case 'stars':
						markup += "<div class='inputcontrol'>";						
						markup += "		<div class='starselect'>";					
						markup += "			<i id='formStar1' class='fa fa-fw fa-star-o lightgray' onclick='helper.form.stars(1);'></i>";
						markup += "			<i id='formStar2' class='fa fa-fw fa-star-o lightgray' onclick='helper.form.stars(2);'></i>";
						markup += "			<i id='formStar3' class='fa fa-fw fa-star-o lightgray' onclick='helper.form.stars(3);'></i>";
						markup += "			<i id='formStar4' class='fa fa-fw fa-star-o lightgray' onclick='helper.form.stars(4);'></i>";
						markup += "			<i id='formStar5' class='fa fa-fw fa-star-o lightgray' onclick='helper.form.stars(5);'></i>";
						markup += "			&nbsp;&nbsp;&nbsp;<span class='inline'>";
						markup += "				&nbsp;&nbsp;<i class='fa fa-times red' style='vertical-align:sub' onclick='helper.form.stars(0);'></i><span class='red' onclick='helper.form.stars(0);'> zurücksetzen</span>&nbsp;&nbsp;";
						markup += "			</span>";
						markup += "		</div>";
						markup += "		<input id='formStarValue' type='hidden' rel='" + theField.Name + "' value='0'/>";
						markup += "</div>";
						
						break;
					case "checkicons":
						markup += "<div class='inputcontrol'>";					
						markup += "		<div class='checkiconselect'>";					
						markup += "			<h2><i id='checkiconOK' class='btn inline fa fa-check-circle lightgray' onclick='helper.form.checkicons(1);'></i>";
						markup += "			&nbsp;&nbsp;<i id='checkiconNOK' class='btn inline fa fa-warning lightgray' onclick='helper.form.checkicons(2);'></i></h2>";
						markup += "		</div>";
						markup += "		<input id='checkIconValue' type='hidden' rel='" + theField.Name + "'  value='0'/>";
						markup += "</div>";
						break;
					case "catlist":
						markup += "<div class='inputcontrol'>";					
						markup += "		<div id='formCatList' class='catlist'>";	
						var catlist = app.obj.categorys
						var catlistSorted = catlist.sort(function(a,b) { return parseFloat(a.ID) - parseFloat(b.ID) } );


						$.each(catlistSorted,function(){
							var catInfo=this;
							var catID = catInfo.ID;
									markup += '<span class="catIcon" rel="' + catID + '" title="' + catInfo.Name + '" style="color:' + catInfo.Color + ';border-color:' + catInfo.Background + ';" onclick="helper.form.catlist(' + catID + ');">';									
										markup += "<i class='flaticon-" + catInfo.Icon + "'></i>";
									markup += "</span>";									
						});
						
						markup += "		</div>";
						markup += "		<input id='catlistValue' type='text' rel='" + theField.Name + "'  value='0'/>";
						markup += "</div>";
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
		stars:function(selected){
			// selected is the number of the selected star
			// set all to 0
			for (i = 0; i <= 5; i++) {
				$("#formStar" + i).removeClass("fa-star fa-star-o lightgray orange");
				if (i <= selected){
					$("#formStar" + i).addClass("fa-star orange");
				}
				else{
					$("#formStar" + i).addClass("fa-star-o lightgray");
				}
			}
			$("#formStarValue").val(selected);
		},
		checkicons:function(selected){
			if (selected == 1){
				$("#checkiconOK").removeClass("lightgray");
				$("#checkiconOK").addClass("green");
				$("#checkiconNOK").removeClass("red");
				$("#checkiconNOK").addClass("lightgray");
			}
			else if (selected == 2){
				$("#checkiconOK").removeClass("green");
				$("#checkiconOK").addClass("lightgray");
				$("#checkiconNOK").removeClass("lightgray");
				$("#checkiconNOK").addClass("red");
			}
			else{
				// 0 or other
				$("#checkiconOK").removeClass("green");
				$("#checkiconOK").addClass("lightgray");
				$("#checkiconNOK").removeClass("red");
				$("#checkiconNOK").addClass("lightgray");
			}
			$("#checkIconValue").val(selected);
		},
		catlist:function(selected){
			if (selected != 0){
				if ( $("#formCatList .catIcon[rel='" + selected + "']").hasClass("selected")){
					$("#formCatList .catIcon[rel='" + selected + "']").removeClass("selected");
				}
				else{
					$("#formCatList .catIcon[rel='" + selected + "']").addClass("selected");
				}
			}
			var value = $("#catlistValue").val();
			var newvalue="";
			$.each($("#formCatList .catIcon.selected"),function(){
				newvalue += $(this).attr("rel") + ",";
			});
			//remove last comma
			if (newvalue != ""){
				newvalue = newvalue.substring(0, newvalue.length - 1);
			}
			$("#catlistValue").val(newvalue);
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
						var fieldValue = data[actfield.Name]
						actControl.val(fieldValue);
						if (actfield.Control == "stars" && !actControl.find("option[value='" + data[actfield.Name] + "']").length) {
							// set stars
							helper.form.stars(fieldValue);
						}
						else if (actfield.Control == "checkicons" && !actControl.find("option[value='" + data[actfield.Name] + "']").length) {
							// set status of checkicons
							helper.form.checkicons(fieldValue);
						}
						else if (actfield.Control == "catlist" && !actControl.find("option[value='" + data[actfield.Name] + "']").length) {
							// set status of checkicons
							var listSelected = data[actfield.Name].split(",");
							$.each(listSelected,function(){
								var theID = this;
								$("#formCatList .catIcon[rel='" + theID + "']").addClass("selected");
							});
							helper.form.catlist(0);
						}
					}
				}
			});
		},
		save: function(theFields, objectTypeID, objectID, objectNameText, actionText, reloadData){
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
			theParameters.DateCreated = helper.datetime.actual.datetimeDB();
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
			helper.dataAPI("setData",dataname, params, function (err, data) {
				if (!err) {
					var result = data;
					if (data == "saved" || data== "updated") {
						helper.popup.hide();
						helper.info.add("success", objectNameText + " " + actionText + "!", true);
						if ( typeof(reloadData) == "undefined" && reloadData == true){
							window.location='./index.html';
							app.initialize();
						}
					}
					else {
						helper.info.add("warning", objectNameText + " nicht " + actionText + ".<hr/><p>" + JSON.stringify(data) +
										"</p><hr/>Bitte kontrollieren Sie die Eingaben und versuchen Sie es erneut.", true);
					}
				}
				else {
					helper.errorLog(err);
					helper.info.add("error", "Es ist ein Fehler aufgetreten:<hr/><p>" + JSON.stringify(data) +
									"</p><hr/>Bitte informieren Sie den Administrator", false);
					helper.popup.hide();
				}

			});
		}
	},
	/** objectslist - get object´s value by key 
		------------------------------------------- */
	getObjItem: function(obj, key, value, callback) {
		var found = false;
		for (var i = 0; i < obj.length; i++) {
			if (obj[i][key] == value) {
				found = true;
				if (typeof(callback) != "undefined"){
					callback(obj[i], true);
				}
				else{
					return obj[i];
				}				
			}
		}
		if (found == false && key == "ID"){
			// try to get it online                     # toDo ?????
			if (obj == app.obj.locations){
				helper.dataAPI("getData","locations", {'i': value},function(err,dataObj){
					if(!err){
						// dataObj holds Locationinfo
						found = true
						if (typeof(callback) != "undefined"){
							callback(dataObj[0], false);
						}
						else{
							return dataObj[0];
						}
					}
					else{
						helper.errorLog(err);
					}
				});			
			}		
		}
		
		if (found == false && typeof(callback) != "undefined"){
			callback(null,false);
		}
		else if (found == false){
			return null;
		}
	},
	gps:{
		interval:10000,
		lat: 48.208348336288076,
		lon: 16.372498869895935,
		mode:"auto",
		state: false,
		errorcount: 0,
		errortimeouts: 0,
		errormax:5,
		successcallback:function(){app.map.gpsupdate();},
		calc:{
			distance: function(lat1a,lon1a,lat2a,lon2a,type){
				// type: car, public, bike, walk
				var distFactor = 1.3;
				switch(type) {
					case 'walk':
						distFactor = 1.3;
						break;
					case 'bike':
						distFactor = 1.4;
						break;
					case 'public':
						distFactor = 1.5;
						break;
					default:
						// car ...
						distFactor = 1.6;
						break;
				}
				
				// dist factor not working with navigation compare
				distFactor = 1.0;
				var lat1=parseFloat(lat1a);
				var lat2=parseFloat(lat2a);
				var lon1=parseFloat(lon1a);
				var lon2=parseFloat(lon2a);
				
				var R = 6371; // Radius of the earth in km
				var dLat = (lat2-lat1).toRad();  // Javascript functions in radians
				var dLon = (lon2-lon1).toRad(); 
				var a1 = Math.sin(dLat/2);
				var a2 = Math.sin(dLat/2);
				var a3 = Math.cos(lat1.toRad());
				var a4 = Math.cos(lat2.toRad());
				var a5 = Math.sin(dLon/2);
				var a6 = Math.sin(dLon/2);
				var a = a1 * a2 + a3 * a4 * a5 * a6; 
				var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
				var d = parseInt((R * c)); // Distance in km	

				var result = d * distFactor;			
				return result.toFixed(1);
			},
			duration: function(distance,type){
				// type: car, public, bike, walk
				var timeFactor = 1;
				switch(type) {
					case 'walk':
						// 4km/h
						timeFactor = 3.2;
						break;
					case 'bike':
						//15km/h
						timeFactor = 15;
						break;
					case 'public':
						// 30 - 40 km/h
						if (distance < 5){
							timeFactor = 30;					
						}
						else if (distance < 15){
							timeFactor = 40;
						}
						else{
							timeFactor = 50;
						}					
						break;
					default:
						// car ... 30 - 70 km/h
						if (distance <= 5){
							timeFactor = 35;
						}
						else if (distance <= 10){
							timeFactor = 38;
						}
						else if (distance <= 15){
							timeFactor = 45;
						}
						else{
							timeFactor = 70;
						}					
						break;
				}
				var duration = distance / timeFactor //(= hours)
				var durH = parseInt(duration);
				var durM = duration - durH;
				durM = parseInt(60 * durM);
				var durText = " " + durH + ":" + helper.text.pad(durM,2); 
				return durText;
			
			},
			offset:function(km){
				// 1km = 90/10001.965729 degrees = 0.0089982311916 degrees
				var result = km * 0.0089982311916
				return result
			}
		},
		position:{		
			get:function(){
				var result = "";
				// watch permanently users position by interval defined in settings
				navigator.geolocation.watchPosition(helper.gps.position.success,helper.gps.position.error,{ 	enableHighAccuracy: true, maximumAge:(helper.gps.interval), timeout:((helper.gps.interval)-3000)}); 
						
				helper.errorLog("GPS: tracking started with interval " + (helper.gps.interval/1000) + " seconds" + result);
			},
			getonce:function(){
				navigator.geolocation.getCurrentPosition(helper.gps.position.success,helper.gps.position.error,{ enableHighAccuracy: true });
				
				helper.errorLog("GPS: single update requested");
			},
			success:function(position){
				// positioning success so reset error count
				helper.gps.errorcount = 0;
				helper.gps.errortimeouts = 0;
				// set last known position to the newly acquired position values
				
				if (helper.gps.mode == "auto"){
					helper.gps.lat = position.coords.latitude;
					helper.gps.lon = position.coords.longitude;	
					helper.gps.state = true;
					helper.gps.successcallback();
				}
			},
			error:function(error){
				// count positioning errors up
				helper.gps.errorcount++;
				var userPosErrorMsg ="";
				var systemErrorMsg="";
				switch(error.code)  
				{  
					case error.PERMISSION_DENIED: 
						systemErrorMsg = "GPS: PERMISSION_DENIED";
						userPosErrorMsg = "Die App muss Deinen aktuellen Standort ermitteln um Informationen zu Anbietern in Deiner Nähe zu liefern<br>Bitte aktiviere die Standortdienste in den Einstellungen Deines Gerätes um diese App zu nutzen.";						
						helper.gps.state = false;	
						helper.info.add("warning",userPosErrorMsg ,true);	
						helper.errorLog(systemErrorMsg);
						break;
					case error.POSITION_UNAVAILABLE: 
						systemErrorMsg = "GPS: POSITION_UNAVAILABLE";
						userPosErrorMsg = "Deine aktuelle Position konnte nicht ermittelt werden da keine Standortdaten von Deinem Gerät übermittelt wurden";			
						helper.gps.state = false;
						helper.info.add("warning",userPosErrorMsg ,true);	
						helper.errorLog(systemErrorMsg);
						break;
					case error.TIMEOUT: 
						systemErrorMsg = "GPS: TIMEOUT";
						//self.showAlert("Positionsabfrage TimeOut");  
						userPosErrorMsg = "Die Positionsbestimmung Deines Standortes konnte mehrfach nicht durchgeführt werden (Timeouts)";
						helper.gps.errortimeouts++;			
						helper.gps.state = false;
						// dont interrupt try again in next interval.
						if (helper.gps.errortimeouts >= helper.gps.errormax){
							helper.info.add("warning",userPosErrorMsg ,true);	
							helper.errorLog(systemErrorMsg);
							helper.gps.errorcount = 0;
							helper.gps.errortimeouts = 0;
						}
						break;  
					default: 
						
					if (app.osName != "iOS"){
			
						systemErrorMsg = "GPS: UNKNOWN ERROR";
						userPosErrorMsg = "Bei der Bestimmung Deines Standortes ist ein Problem aufgetreten, bitte kontrolliere Die Standorteinstellungen Deines Gerätes";							
						helper.gps.state = false;
						if (helper.gps.errorcount >= helper.gps.errormax){
							helper.info.add("warning",userPosErrorMsg ,true);	
							helper.errorLog(systemErrorMsg);
							helper.gps.errorcount = 0;
							helper.gps.errortimeouts = 0;
						}
					}	
					break;  
				}
			}
		}
	},
	/** image lazy update nad image geturl
		----------------------------- */
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
				var imageName= theImage.attr("imgname");
				var imageUser = theImage.attr("imgusr");
				
				if (imageID != 0){
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
				}
				else{
					// get imagedetails for blogimage
					var imageToChange = theImage; 
					var theURL = app.blogURL + imageUser + "/med_" + imageName;
										
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
						//theURL = theURL +  "&width=" + maxImageWidth;
						imageToChange.attr("src",theURL);
						//imageToChange.attr("title", imgObj.Title);
						//imageToChange.attr("alt", imgObj.Alt);
					}
					else{
						// change background of element
						if( theImage.hasClass("height100") ){
							// 100% height
							imageToChange.css({'background': 'url(' + theURL + ') no-repeat','background-size': 'auto 100%', 'background-position':'center center'});
						}
						else{
							// 100% width
							imageToChange.css({'background': 'url(' + theURL +  ') no-repeat','background-size': '100% auto', 'background-position':'center center'});
							
						}
					}
				}
            });        
        },
		geturl:function(imageID,callback){
				if (imageID != 0){
					// get image-url
					helper.dataAPI("getData","images", {'i': imageID},function(err,imgObjs){
						if(!err){
							var imgObj = imgObjs[0];
							var theURL = app.imageURL + "?File=IMG/" + imgObj.FilePath
										+ "/" + imgObj.FileName + "." + imgObj.FileType ;
							callback(theURL);
						}
						else{
							helper.errorLog(err);
						}
					});
				}
		}
    },
	info:{ 
        lastID:0,
        timeout: 5000,
        add: function(infotype, infotext, autohide, cancelable, callbackCancel, callbackFinal){
			if(typeof(cancelable) == "undefined"){cancelable = false;}
            helper.info.lastID++;
			var lastID = helper.info.lastID;
            var markup = "<span rel='" + lastID + "' class='infoelement ";
            var classTmp = "";
            var iconTmp = "";
            switch(infotype){
                case 'info': 
                    classTmp= "blue-bg-t7 white";
                    iconTmp = "<i class='fa fa-info-circle'></i>&nbsp;&nbsp;";
                    break;
                case 'tipp': 
                    classTmp= "yellow-bg-t7 darkgray";
                    iconTmp = "<i class='fa fa-thumb-tack'></i>&nbsp;&nbsp;";
                    break;
                case 'success': 
                    classTmp= "green-bg-t7 white";
                    iconTmp = "<i class='fa fa-check-circle'></i>&nbsp;&nbsp;";
                    break;
                case 'warning': 
                    classTmp= "orange-bg-t7 white";
                    iconTmp = "<i class='fa fa-warning'></i>&nbsp;&nbsp;";
                    break;      
                case 'error': 
                    classTmp= "red-bg-t7 white";
                    iconTmp = "<i class='fa fa-times-circle'></i>&nbsp;&nbsp;";
                    break;       
                case 'undo': 
                    classTmp= "darkgray-bg-t7 white";
                    iconTmp = "<i class='fa fa-undo'></i>&nbsp;&nbsp;";
                    break;                
                default: 
                    classTmp= "lightgray-bg-t7 white";
                    iconTmp = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
                    break;
            }
            markup += classTmp + "'>";
			markup += 	"<span class='table'>";
			markup += 		"<span class='tr'>";
			markup += 			"<span class='td40 align-center vertical-middle''>" + iconTmp + "</span>";
			markup += 			"<span class='td small align-center vertical-middle'>" + infotext + "</span>";
			
			if (cancelable == true && typeof(callbackCancel) != "undefined"){
				markup += 		"<span class='td40 infocancel align-center vertical-middle' rel='" + lastID + "'><i class='fa fa-undo'></i></span>";				
			}
            markup += 			"<span class='td40 infoclose align-center vertical-middle'  rel='" + lastID + "'><i class='fa fa-times'></i></span>";
            markup +=  		"</span>";
            markup +=  	"</span>";
            markup += "</span>";
            
		
            if( typeof(autohide) != "undefined" && autohide == true){                
                setTimeout(function(){
                    var theID = lastID;		
					if(typeof(callbackFinal) != "undefined"){
						var isCancelable = cancelable;
						var theCallback = callbackFinal;
						if (isCancelable == true && typeof(theCallback) != "undefined"){
							theCallback();
						}
					}
                    helper.info.hide(theID);			
                },helper.info.timeout);
            }
			
			// add it to the dom 
            $("#info").prepend(markup);
			
			// bind callbacks
				$("span.infoclose[rel='" + lastID + "']").off("click");
				$("span.infoclose[rel='" + lastID + "']").on("click",function(){ 
					$("span.infoelement[rel='" + lastID + "']").remove();
					if(typeof(callbackFinal) != "undefined"){
						callbackFinal();
					}
				});
					
				if (cancelable == true && typeof(callbackCancel) != "undefined"){
					$("span.infocancel[rel='" + lastID + "']").off("click");
					$("span.infocancel[rel='" + lastID + "']").on("click",function(){ 
						$("span.infoelement[rel='" + lastID + "']").remove();
						if(typeof(callbackCancel) != "undefined"){
							callbackCancel();
						}
					});
				}			
            
        },
        hide: function(id){
            $("span.infoelement[rel='" + id + "']").remove();
        }
    },	
	initialize:function(){
		// called on documentready:
		helper.errorLog("helper initialize ...");
		// document ready does not mean the mobile device is ready (event "deviceready")
		if (helper.appIsMobile == false){
			setTimeout(function(){
				if (helper.appIsMobile == false){
					helper.deviceready(true);
				}
			},helper.deviceTimeout);
		}
		
		helper.firststart = helper.check.firststart();
		if (helper.firststart == true){
			if (helper.url.param.get("hp") == ""){ // only if not called from web
				// do firststart things
				// alert("first appstart");
				// eventually show "dont show this again"
				app.page.showHelp('start');
				// set firststart to false (if not user wants to show again)
				helper.settings.set("FirstStart", "false");
				helper.firststart = false;
			}
		}
		
		// Allow Cross domain requests per ajax!
		$.support.cors = true;
		
		// start onlinecheck
		setInterval(function(){
				var state = helper.check.online.state();
				var info = helper.check.online.info;
				if (state == false && info == false){
					helper.info.add("error","Kein Zugriff auf das Internet möglich. Bitte stelle eine Onlineverbindung her um die App weiter zu benutzen.",false);
					helper.check.online.info = true;
				}
				if (state == true){
					helper.check.online.info = false;
				}
		},helper.check.online.interval);
		helper.check.online.state();
		
		// check and set screen dimensions
		helper.screen.width = helper.screen.check.width();
		helper.screen.height = helper.screen.check.height();
		helper.screen.maxpixel = helper.screen.check.maxpixel();
		
		// initialize Tabs for settings screen
		$('#settingsTabs').easyResponsiveTabs();
				
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
		$("#settingsClose").on("click");
		$("#settingsClose").on("click",function() {
			app.page.show("start");
		});		
		
		// now initialize the app and start over
		app.initialize();
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
	popup:{
        show: function(title, content, iconname, ok, cancel,callbackOk,callbackCancel,okText,cancelText,nopadding,topButtons,callbackDoNotShow){
            var theOverlay = $("#popup");

            // set title, content and icon
            if (typeof(title) != "undefined"){ 
                theOverlay.find(".popup-title").html(title);
            }
            if (typeof(content) != "undefined"){ 
                theOverlay.find(".popup-inner").html(content);
            }
			
            if (typeof(iconname) != "undefined" && iconname != ""  && iconname != " "  && iconname != "  " ){ 
				// add a icon to the title
				$(".popup-icon").empty().append("<i class='" + iconname + "'></i>" );
				$(".popup-icon").removeClass("hidden");
            }
			else{
				$(".popup-icon").addClass("hidden");
			}
            if ( (typeof(ok) == "undefined" || ok == false) && (typeof(cancel) == "undefined" || cancel== false) ){
                theOverlay.find(".popup-buttons").hide();
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
			// bind function for callback if "dont show again" is checked
			$("#chkDoNotShow").prop("checked",false);
			if (typeof(callbackDoNotShow) != "undefined" || callbackDoNotShow == true){ 
				$("#wrapDoNotShow").show();
				$("#chkDoNotShow").off('click');
				$("#chkDoNotShow").on("click",function(){
					callbackDoNotShow($("#chkDoNotShow").prop("checked"));
				});
			}
			else{
				$("#wrapDoNotShow").hide();
			}
				
			//transition effect    
            /*$('#mask').fadeIn(500);
            $('#mask').fadeTo("fast", 0.9);*/
			$('#mask').addClass("visible");
            
			//Set height and width to mask to fill up the whole screen
            $('#mask').css({ 'width': helper.screen.width, 'height': helper.screen.height + 75 });
            
            theOverlay.show();
			
			// default padding or not?
			if(typeof(nopadding) != "undefined" && nopadding == true){
				$("#popup .popup-inner").addClass("nopadding");
			}
			else{
				$("#popup .popup-inner").removeClass("nopadding");
			}
			
			//show buttons on top and show them fixed?
			if(typeof(topButtons) != "undefined" && topButtons == true){
				$("#popup .popup-wrap").addClass("fixedTop");
				$("#popup .popup-buttons").addClass("fixedTop");
			}
			else{
				$("#popup .popup-wrap").removeClass("fixedTop");
				$("#popup .popup-buttons").removeClass("fixedTop");
			}
			
			
			var popupH = theOverlay.outerHeight();
			var popupW = theOverlay.outerWidth();
			
            var topPos = (helper.screen.height - popupH) / 2;
            if (topPos < 10) {
                topPos = 10;
            }
            var leftPos = (helper.screen.width - popupW) / 2;
            if (leftPos < 5) {
                leftPos = 5;
            }
            theOverlay.css({'top': topPos + 'px','margin-left': leftPos + 'px','margin-left': leftPos + 'px'});
			theOverlay.addClass("visible");
			
			// update tooltips in popups markup
			helper.tooltips.update();
			
			$("#popup div.popup-wrap").scrollTop(0);
        },
        hide: function(){	
            var theOverlay = $("#popup");
            //$("#mask").fadeOut(500);
			$('#mask').removeClass("visible");
            theOverlay.hide();	
			
			theOverlay.removeClass("visible");
        }
    },   
	screen:{
		width:100,
		height:100,
		maxpixel:0,
		heightcorr: 50,	// correct by subtracting fixed elements heights
		check:{
			height:function(){
				return $(window).height() - helper.screen.heightcorr; 
			},
			width:function(){
				return $(window).width();
			},
			maxpixel:function(){
				var result = 0;
				if (helper.screen.width >= helper.screen.check.height){
					result = helper.screen.width;
				}
				else{
					result = helper.screen.height;
				}
				return result;
			}
		},
		update:function(jqElem){
			// this should fix issues on elements not redrawing on android screens
			// http://www.eccesignum.org/blog/solving-display-refreshredrawrepaint-issues-in-webkit-browsers
			var n = document.createTextNode(' ');
			jqElem.append(n);
			setTimeout(function(){n.parentNode.removeChild(n)}, 0);
		}
	},
	/** settings load, save, get, set 
		------------------------------------------- */
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
				
				if(settingValue == "true"){
					settingValue = true;
				}
				if(settingValue == "false"){
					settingValue = false;
				}
				if (settingValue != null && settingValue != "err"  && settingValue != "undefined"){ 
				/* && settingValue != "" && settingValue != " " */
					if (settingControl == "INPUT"){
						var settingType = settingElem.attr("type");
						switch(settingType){
							case 'text':
							case 'password':
							case 'email':
								settingElem.val(settingValue);
								break;
							case 'checkbox':
								settingElem.prop("checked",settingValue);
								break;
							case 'radio':
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
					var defaultVal = settingElem.attr("default-value");
					settingElem.val(defaultVal);
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
						case 'email':
							settingValue = settingElem.val();
							break;
						case 'checkbox':
						case 'radio':
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
			helper.info.add("success", "Die Einstellungen wurden gespeichert", true, false);
			
			app.load(false); // false == not the first load after app start
			//window.location='./index.html';
			//helper.settings.load();
			//app.initialize();
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
	
		// only used if on mobile device, otherwise the link - method via web-browser is used
		// initially set all parameters to null for not used parts to ensure the proper function of the sharing plugin
		*/
			helper.errorLog("sharing pressed");
			var theMessage = null;
			var theSubject = null;
			var theImage = null;
			var theLink = null;
			if (helper.appIsOnline && helper.appIsMobile){
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
				// call devices sharing dialogue
				helper.spinner.show(true,true);
				window.plugins.socialsharing.share(theMessage, theSubject, theImage, theLink);
			}
			else if(helper.appIsOnline){				
				/** Sharing on Webbrowser
					--------------------- */			
				// for the sharing links prevent null values - replace by ""
				if (typeof(message) == "undefined"){ 
					theMessage = "";
				}else{theMessage = message;}
				if (typeof(subject) == "undefined"){ 
					theSubject = "";
				}else{theSubject = subject;}
				if (typeof(image) == "undefined"){ 
					theImage = "";
				}else{theImage = image;}
				if (typeof(link) == "undefined"){ 
					theLink = "";
				}else{theLink = link;}
				
				// for email URL encode the parts of the mailto link  ------- TODO ###############################
				
				var markup = app.markup.get("websharing",{link:encodeURIComponent(theLink),subject:encodeURIComponent(theSubject),message:encodeURIComponent(theMessage),image:encodeURIComponent(theImage)});
				helper.popup.show('Teilen über',                                      
									markup,     
									' fa fa-share-alt',
									false,false,function(){},function(){}                    
				);
			}
			else{
				//not online
			}
	},
	spinner:{
        queue: 0,
        timeout: 3000,
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
	splash:{
		show:function(){
			$("#splash").addClass("visible");
		},
		hide:function(){
			$("#splash").removeClass("visible");
		}
	},
	tooltips:{
		// attribution: http://osvaldas.info/elegant-css-and-jquery-tooltip-responsive-mobile-friendly
		update: function(){
			var targets = $( '.tooltip' ),
				target  = false,
				tooltip = false,
				title   = false;
		 
			targets.bind( 'mouseenter', function()
			{
				target  = $( this );
				tip     = target.attr( 'title' );
				tooltip = $( '<div id="tooltip"></div>' );
		 
				if( !tip || tip == '' )
					return false;
		 
				target.removeAttr( 'title' );
				tooltip.css( 'opacity', 0 )
					   .html( tip )
					   .appendTo( 'body' );
		 
				var init_tooltip = function()
				{
					if( $( window ).width() < tooltip.outerWidth() * 1.5 )
						tooltip.css( 'max-width', $( window ).width() / 2 );
					else
						tooltip.css( 'max-width', 340 );
		 
					var pos_left = target.offset().left + ( target.outerWidth() / 2 ) - ( tooltip.outerWidth() / 2 ),
						pos_top  = target.offset().top - tooltip.outerHeight() - 20;
		 
					if( pos_left < 0 )
					{
						pos_left = target.offset().left + target.outerWidth() / 2 - 20;
						tooltip.addClass( 'left' );
					}
					else
						tooltip.removeClass( 'left' );
		 
					if( pos_left + tooltip.outerWidth() > $( window ).width() )
					{
						pos_left = target.offset().left - tooltip.outerWidth() + target.outerWidth() / 2 + 20;
						tooltip.addClass( 'right' );
					}
					else
						tooltip.removeClass( 'right' );
		 
					if( pos_top < 0 )
					{
						var pos_top  = target.offset().top + target.outerHeight();
						tooltip.addClass( 'top' );
					}
					else
						tooltip.removeClass( 'top' );
		 
					tooltip.css( { left: pos_left, top: pos_top } )
						   .animate( { top: '+=10', opacity: 1 }, 50 );
				};
		 
				init_tooltip();
				$( window ).resize( init_tooltip );
		 
				var remove_tooltip = function()
				{
					tooltip.animate( { top: '-=10', opacity: 0 }, 50, function()
					{
						$( this ).remove();
					});
		 
					target.attr( 'title', tip );
				};
		 
				target.bind( 'mouseleave', remove_tooltip );
				tooltip.bind( 'click', remove_tooltip );
			});
		}
	},
	text:{
		replaceAll:function(str,find,replacement){
			find = find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			var re = new RegExp(find, 'g');
			var result = str.replace(re,replacement);
			return result;
		},
		right: function(str, chr) {
			return str.slice(str.length - chr, str.length);
		},
		left: function(str, chr) {
			return str.slice(0, chr - str.length);
		},
		pad: function(number, size) { // return a string with [size] leading zeros from a [number]
			var s = number + "";
			while (s.length < size) s = "0" + s;
			return s;
		}
	},
	url:{
		param:{
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
			/** add/remove/update a querystring parameter. 
			   Not supplying a value will remove the parameter, 
			   supplying one will add/update the paramter. 
			   If no URL is supplied, it will be grabbed from window.location. */
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
	},
	validate:function(string, type){
			var re = "";
			switch(type){
				case 'email':
					re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
					break;
				default: 
					return false;
					break;								
			}
			return re.test(string);			
	}
}
/** alphabetically sort function for array.sort */
function alphabetical(a, b){
     if (isNaN(a) || isNaN(b)) {
    return a > b ? 1 : -1;
  }
  return a - b;
}
/** base64 encode */
var Base64={
_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}
}

// Converts numeric degrees to radians //
if (typeof(Number.prototype.toRad) === "undefined"){
	Number.prototype.toRad = function() 
	{
		return this * Math.PI / 180;
	}
}
/** jQuery plugins and (map-)extensions */
/** browser-independent ellipsis ... 
    ------------------------------------ */
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

/** Leaflet Easy Button - Copyright (C) 2014 Daniel Montague - https://github.com/CliffCloud ... adapted by in-u! 2015 to allow each button to have a unique ID
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
L.Control.EasyButtons = L.Control.extend({
options: {
position: 'topleft',
title: '',
id:'custControl',
intentedIcon: 'fa-circle-o'
},
onAdd: function () {
var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
this.link = L.DomUtil.create('a', 'leaflet-bar-part', container);
this._addImage()
this.link.href = '#';
L.DomEvent.on(this.link, 'click', this._click, this);
this.link.title = this.options.title;
this.link.id = this.options.id
return container;
},
intendedFunction: function(){ alert('no function selected');},
_click: function (e) {
L.DomEvent.stopPropagation(e);
L.DomEvent.preventDefault(e);
this.intendedFunction();
},
_addImage: function () {
var extraClasses = this.options.intentedIcon.lastIndexOf('fa', 0) === 0 ? ' fa fa-lg' : ' glyphicon';
L.DomUtil.create('i', this.options.intentedIcon + extraClasses, this.link);
}
});
L.easyButton = function( btnIcon , btnFunction , btnTitle , btnMap, btnID ) {
var newControl = new L.Control.EasyButtons;
if (btnIcon) newControl.options.intentedIcon = btnIcon;
if ( typeof btnFunction === 'function'){
newControl.intendedFunction = btnFunction;
}
if (btnTitle) newControl.options.title = btnTitle;
if (btnID) newControl.options.id = btnID;
if ( btnMap == '' ){
// skip auto addition
} else if ( btnMap ) {
btnMap.addControl(newControl);
} else {
map.addControl(newControl);
}
return newControl;
};