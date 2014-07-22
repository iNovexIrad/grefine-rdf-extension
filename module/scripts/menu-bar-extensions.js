ExporterManager.MenuItems.push({});//add separator
ExporterManager.MenuItems.push(
		{
			"id" : "exportRdfXml",
          	"label":"RDF as RDF/XML",
          	"click": function() { RdfExporterMenuBar.exportRDF("rdf", "rdf");}
		}
);
ExporterManager.MenuItems.push(
		{
			"id" : "exportRdfTurtle",
        	"label":"RDF as Turtle",
        	"click": function() { RdfExporterMenuBar.exportRDF("Turtle", "ttl"); }
		}
);

RdfExporterMenuBar = {};

RdfExporterMenuBar.exportRDF = function(format, ext) {
    if (!theProject.overlayModels.rdfSchema) {
        alert(
            "You haven't done any RDF schema alignment yet!"
        );
    } else {
        RdfExporterMenuBar.rdfExportRows(format, ext);
    }
};

RdfExporterMenuBar.rdfExportRows = function(format, ext) {
    var name = $.trim(theProject.metadata.name.replace(/\W/g, ' ')).replace(/\s+/g, '-');
    var form = document.createElement("form");
    $(form)
        .css("display", "none")
        .attr("method", "post")
        .attr("action", "command/core/export-rows/" + name + "." + ext)
        .attr("target", "gridworks-export");

    $('<input />')
        .attr("name", "engine")
        .attr("value", JSON.stringify(ui.browsingEngine.getJSON()))
        .appendTo(form);
    $('<input />')
        .attr("name", "project")
        .attr("value", theProject.id)
        .appendTo(form);
    $('<input />')
        .attr("name", "format")
        .attr("value", format)
        .appendTo(form);

    document.body.appendChild(form);

    window.open("about:blank", "gridworks-export");
    form.submit();

    document.body.removeChild(form);
};

RdfExporterMenuBar.editRdfSchema = function(reset) {
    new RdfSchemaAlignmentDialog(reset ? null : theProject.overlayModels.rdfSchema);
};

var RdfReconciliationManager = {};

RdfReconciliationManager.newSparqlService = function(){
	new ReconciliationSparqlServiceDialog();
};
RdfReconciliationManager.newRdfService = function(){
	new ReconciliationRdfServiceDialog();
};
RdfReconciliationManager.newSindiceService = function(){
	new ReconciliationSindiceServiceDialog();
};
RdfReconciliationManager.newStanbolService = function(){
	new ReconciliationStanbolServiceDialog();
};

RdfReconciliationManager.registerService = function(data,level){
	if (data.code === "error"){
		alert('Error: ' + data.message);
	}else{
		var url = location.href;  // entire url including querystring - also: window.location.href;
		var baseURL = url.substring(0,url.lastIndexOf('/'));
		var service_url = baseURL + '/extension/rdf-extension/services/' + data.service.id;
		
		//ReconciliationManager doesnot call this method upon unregister.. this is why I am calling it myself
		ReconciliationManager._rebuildMap();
		
		if(!ReconciliationManager.getServiceFromUrl(service_url)){
			ReconciliationManager.registerStandardService(service_url);
		}
		if(level){
			DialogSystem.dismissUntil(level - 1);
		}
	}
};

function ReconciliationStanbolServiceDialog() {

    var self = this; 

    var dialog = $(DOM.loadHTML("rdf-extension", "scripts/stanbol-service.html"));

    var inputUri = dialog.find("input#stanbol-uri");

    dialog.find("button#cancel").click(function() {
        DialogSystem.dismissUntil(self._level - 1);
    });

    dialog.find("button#register").click(function() {
    	
    	if ($("img#validation-img").length) { $("img#validation-img").remove(); }
    	
	    var uri = inputUri.val();
	    
	    if(uri.charAt(uri.length-1) == "/") {
	    	uri = uri.slice(0, -1);
	    	inputUri.val(uri);
	    }
    	
    	if (validateURI(uri)) {
    		inputUri.attr("disabled", "disabled");
    		inputUri.after($('<img src="extension/rdf-extension/images/spinner.gif" width="14" height="14" alt="fetching..." class="validation" id="validation-img" />'));
		    $.post("command/rdf-extension/addStanbolService",
				    {
					    "uri": uri,
	                    "engine": JSON.stringify(ui.browsingEngine.getJSON()),
	                    "project": theProject.id
				    },
				    function(data) {
				    	
				    	var registering = $("dl#stanbol-registering");
				    	registering.parent().height($("p#stanbol-help").height());
				    	registering.parent().fadeIn("slow");
				    	$("p#stanbol-help").hide();
				    	$.each(data, function(i, obj) {
				    		//check issue #579: http://code.google.com/p/google-refine/issues/detail?id=579
				    		if (ReconciliationManager.getServiceFromUrl(obj.uri)) {
				    			self.printAddedService(registering, obj, false)
				    		} else {
					    	    ReconciliationManager.registerStandardService(obj.uri, function(index) {
					    	    	self.printAddedService(registering, obj, true)
					    	    });	
				    		}
				    	});
				    	$("img#validation-img").remove();
				    	//DialogSystem.dismissUntil(self._level - 1);
				    	dialog.find("button#register").hide();
				    	dialog.find("button#cancel").text("Close");
		            },
	                "json");
    	} else {
    		inputUri.addClass("error");
    		inputUri.after($('<img src="extension/rdf-extension/images/no.png" width="16" height="16" alt="invalid" class="validation" id="validation-img" />'));	
    		alert("Not valid URI")
    	}
    });
	
	var frame = DialogSystem.createDialog();
    frame.width("500px");
    dialog.appendTo(frame);
    
	self._level = DialogSystem.showDialog(frame);
	
};

ReconciliationStanbolServiceDialog.prototype.printAddedService = function(container, obj, registered) {
	var cached = (obj.local ? "locally cached" : "not locally cached");
	var image = (registered ? "yes" : "no");
	var label = (registered ? "registered" : "not added (service already registered)");
	var sniper = '<dt><a href="' + obj.uri + '">' + obj.uri + '</a> <img src="extension/rdf-extension/images/' + image + '.png" width="16" height="16" alt="' + label + '" title="' + label + '" /></dt><dd><strong>' + obj.name + '</strong>, ' + cached + '</dd>';
	if (!registered) {
		sniper += '<dd>' + label + '</dd>';
	}
	container.append(sniper).fadeIn("slow");
};

function ReconciliationSindiceServiceDialog(){
	var self = this;
	var frame = DialogSystem.createDialog();
    frame.width("400px");
    
    var header = $('<div></div>').addClass("dialog-header").text("Add reconciliation service").appendTo(frame);
    var body = $('<div class="grid-layout layout-full"></div>').addClass("dialog-body").appendTo(frame);
    var footer = $('<div></div>').addClass("dialog-footer").appendTo(frame);
    
    var html = $(
    	  '<div class="rdf-reconcile-spaced">' + 
    	    'Set up a new reconciliation service that uses <a target="_blank" href="http://www.sindice.com">Sindice.com</a> to search on a single site.' + 
    	  '</div>' +
    	  '<table>' +
    	    '<tr>' +
    	      '<th>' + 
    	  	    '<label>Domain:</label>' +
    	  	  '</th>' +
    	  	  '<td class="rdf-reconcile-spaced">' +
    	  	    '<input type="text" bind="domain" size="32" />' +
    	  	    '<div class="rdf-reconcile-field-details">e.g. dbpedia.org</div>' +
    	  	  '</td>' +
    	  	'</tr>' +
    	  '</table>'    		
    ).appendTo(body);
    
    self._elmts = DOM.bind(html);
    
    self._level = DialogSystem.showDialog(frame);
    self._footer(footer);
}

ReconciliationSindiceServiceDialog.prototype._footer= function(footer){
	var self = this;
	$('<button></button>').addClass('button').html("&nbsp;&nbsp;Ok&nbsp;&nbsp;").click(function() {
        var domain = self._elmts.domain.val();
        if(!domain){
        	alert("Domain need to be provided!");
        	return;
        }
        $.post("command/rdf-extension/addSindiceService",{"domain":domain},function(data){
			RdfReconciliationManager.registerService(data,self._level);
		},"json");
    }).appendTo(footer);
	$('<button></button>').addClass('button').text("Cancel").click(function() {
        DialogSystem.dismissUntil(self._level - 1);
    }).appendTo(footer);
};

function ReconciliationRdfServiceDialog(){
	var self = this;
	var dialog = $(DOM.loadHTML("rdf-extension","scripts/rdf-service-dialog.html"));
	this._elmts = DOM.bind(dialog);
	
	this._elmts.other_label_chk.click(function(){
		if($(this).attr("checked")){
			self._elmts.other_properties.show();
		}else{
			self._elmts.other_properties.hide();
		}
	});
	
	this._elmts.file_source_upload.add(this._elmts.file_source_url).bind("click", function(){
		var upload = self._elmts.file_source_upload.attr("checked");
		if(upload){
			self._elmts.file_upload_input.attr("disabled",false);
			self._elmts.file_url_input.attr("disabled",true);
		}else{
			self._elmts.file_upload_input.attr("disabled",true);
			self._elmts.file_url_input.attr("disabled",false);
		}
	});
	
	var frame = DialogSystem.createDialog();
    
    frame.width("600px");
    
    var header = $('<div></div>').addClass("dialog-header").text("Add file-based reconciliation service").appendTo(frame);
    var body = $('<div></div>').addClass("dialog-body").append(dialog).appendTo(frame);
    var footer = $('<div></div>').addClass("dialog-footer").appendTo(frame);
    
	this._level = DialogSystem.showDialog(frame);
	this._elmts.other_properties.hide();
	this._footer(footer);
}

ReconciliationRdfServiceDialog.prototype._footer = function(footer){
	var self = this;
	$('<button></button>').addClass('button').html("&nbsp;&nbsp;OK&nbsp;&nbsp;").click(function() {
		self._dismissBusy = DialogSystem.showBusy('Adding new reconciliation service');
	    var name = self._elmts.service_name.val();
	    if(name.trim()===""){
	    	alert("Name is required");
	    	self._dismissBusy();
	    	return;
	    }
	    var props = self._elmts.label_prop_container.find('input[name="label_prop"]:checked');
	    var prop_uris = "";
	    for(var i=0;i<props.length;i++){
	    	prop_uris += " " + $(props[i]).val();
	    }
	    if(self._elmts.other_label_chk.attr("checked")){
	    	prop_uris += " " + self._elmts.other_properties_textarea.val();
	    }
	    if(prop_uris===""){
	    	alert("At least one label property should  be provided");
	    	self._dismissBusy();
	    	return;
	    }
	    
	    if (self._elmts.file_source_url.attr('checked')){
	    	var file_url = self._elmts.file_url_input.val();
	    	var file_format = self._elmts.file_format_input.val();
	    	if(file_url.trim()===""){
		    	alert("File URL is required");
		    	self._dismissBusy();
		    	return;
		    }
	    	
	    	var services = ReconciliationManager.getAllServices();
	    	
	    	$.post("command/rdf-extension/addService",
					{"datasource":"file_url","name":name,"url":file_url,properties:prop_uris, "file_format":file_format},
					function(data){
						self._dismissBusy();
						RdfReconciliationManager.registerService(data,self._level);					
			},"json");
	    	return;
	    }
	    
	    self._elmts.hidden_service_name.val(name);
	    self._elmts.hidden_properties.val(prop_uris);
	    
	    self._elmts.file_upload_form.ajaxSubmit({
	    	dataType:  'json',
	    	type:'post',
	    	success: function(data) {
	    		self._dismissBusy();
	    		RdfReconciliationManager.registerService(data,self._level);
			}
		});
	    
	}).appendTo(footer);
	
	$('<button></button>').addClass('button').text("Cancel").click(function() {
	    DialogSystem.dismissUntil(self._level - 1);
	}).appendTo(footer);
};


function ReconciliationSparqlServiceDialog(){
	var self = this;
	var dialog = $(DOM.loadHTML("rdf-extension","scripts/sparql-service-dialog.html"));
	this._elmts = DOM.bind(dialog);
	
	this._elmts.other_label_chk.click(function(){
		if($(this).attr("checked")){
			self._elmts.other_properties.show();
		}else{
			self._elmts.other_properties.hide();
		}
	});
	
	var frame = DialogSystem.createDialog();
    
    frame.width("600px");
    
    var header = $('<div></div>').addClass("dialog-header").text("Add SPARQL-based reconciliation service").appendTo(frame);
    var body = $('<div></div>').addClass("dialog-body").append(dialog).appendTo(frame);
    var footer = $('<div></div>').addClass("dialog-footer").appendTo(frame);
    
	this._level = DialogSystem.showDialog(frame);
	this._elmts.other_properties.hide();
	this._footer(footer);
}

ReconciliationSparqlServiceDialog.prototype._footer = function(footer){
	var self = this;
	$('<button></button>').addClass('button').html("&nbsp;&nbsp;OK&nbsp;&nbsp;").click(function() {
		self._dismissBusy = DialogSystem.showBusy('Adding new reconciliation service');
	    var name = self._elmts.service_name.val();
	    var endpoint = self._elmts.endpoint_url.val()
	    var graph_uri = self._elmts.graph_uri.val();
	    if(name.trim()===""){
	    	alert("Name is required");
	    	self._dismissBusy();
	    	return;
	    }
	    if(endpoint.trim()===""){
	    	alert("Endpoint URL is required");
	    	self._dismissBusy();
	    	return;
	    }
	    var type = self._elmts.endpoint_type.val();
	    
	    var props = self._elmts.label_prop_container.find('input[name="label_prop"]:checked');
	    var prop_uris = "";
	    for(var i=0;i<props.length;i++){
	    	prop_uris += " " + $(props[i]).val();
	    }
	    if(self._elmts.other_label_chk.attr("checked")){
	    	prop_uris += " " + self._elmts.other_properties_textarea.val();
	    }
	    if(prop_uris===""){
	    	alert("At least one label property should  be provided");
	    	self._dismissBusy();
	    	return;
	    }
	    
	    RdfReconciliationManager.synchronizeServices(
	    	function(){
	    			$.post("command/rdf-extension/addService",
	    					{"datasource":"sparql","name":name,"url":endpoint,"type":type,"graph":graph_uri,properties:prop_uris},
	    					function(data){
	    						self._dismissBusy();
	    						RdfReconciliationManager.registerService(data,self._level);					
	    					},"json");
			}
	    );
	}).appendTo(footer);
	
	$('<button></button>').addClass('button').text("Cancel").click(function() {
	    DialogSystem.dismissUntil(self._level - 1);
	}).appendTo(footer);
};

RdfReconciliationManager.synchronizeServices = function(onDone){
	var services = ReconciliationManager.getAllServices();
	var ids = [];
	for(var i=0;i<services.length;i++){
		if(services[i].url){
			ids.push(services[i].url);
		}
	}
	$.post("command/rdf-extension/initializeServices",{"services":JSON.stringify(ids)},function(data){
		RdfReconciliationManager.registerService(data);
		if(onDone){
			onDone();
		}
	},"json");
};


//extend the column header menu
$(function(){
    
	ExtensionBar.MenuItems.push(
			{
				"id":"reconcile",
				"label": "RDF",
				"submenu" : [
					{
						"id": "rdf/edit-rdf-schema",
						label: "Edit RDF Skeleton...",
						click: function() { RdfExporterMenuBar.editRdfSchema(false); }
					},
					{
						"id": "rdf/reset-rdf-schema",
						label: "Reset RDF Skeleton...",
						click: function() { RdfExporterMenuBar.editRdfSchema(true); }
					},
					{},
			        {
			        	"id": "rdf/reconcile",
			            label: "Add reconciliation service",
			            submenu:[
			                     {
			                    	 "id" :"rdf/reconcile/sparql",
			                    	 label: "Based on SPARQL endpoint...",
			                    	 click: function() { RdfReconciliationManager.newSparqlService(); }
			                     },
			                     {
			                    	 "id":"rdf/reconcile/dump",
			                    	 label:"Based on RDF file...",
			                    	 click: function() { RdfReconciliationManager.newRdfService(); }        	 
			                     },
			                     {
			                    	 "id" : "rdf/reconcile/sindice",
			                    	 label: "Based on a Sindice site search...",
			                    	 click: function() { RdfReconciliationManager.newSindiceService(); }        	 
			                     },
			                     {
			                    	 "id" : "rdf/reconcile/stanbol",
			                    	 label: "Based on a Apache Stanbol EntityHub...",
			                    	 click: function() { RdfReconciliationManager.newStanbolService(); }        	 
			                     }
						]
					
			        }
			    ]
			},
			{  //PUBISH DATA for MATONTO
				"id":"publishData",
				"label":"Publish Data",
				"submenu" : [ 
					{
						"id" : "matProj/publish-matonto-data",
						label: "Publish data to MatOnto",
						click: function() {
							var frame = DialogSystem.createDialog();
    
							frame.width("600px");
    
							var header = $('<div></div>').addClass("dialog-header").text("Publish Data").appendTo(frame);
							var body = $('<div>Are you sure you want to publish to the interwebs?</div>').addClass("dialog-body").appendTo(frame);
							        var input = $('<p></p>').addClass('DataName').text("Data Set Name:       ").appendTo(body);
							$('<input type="text" name="DataNameInput" id="DataNameInput">').addClass('DataNameInput').val(theProject.metadata.name).appendTo(input);
							
							var dataDescInput = $('<p></p>').addClass('DataDesc').text("Data Set Description:").appendTo(body);
							$('<input type="text" name="DataDescInput" id="DataDescInput">').addClass('DataDescInput').appendTo(dataDescInput);
							
							       var apiInput = $('<p></p>').addClass('APIKey').text("CKAN API Key:        ").appendTo(body);
							$('<input type="text" name="ApiKeyInput" id="ApiKeyInput">').addClass('ApiKeyInput').val("5662a180-bff3-4d3e-974d-8ffdc4a1d7ac").appendTo(apiInput);
							
							var pubUrlInput = $('<p></p>').addClass('PublishUrl').text("Publishing Service URL:").appendTo(body);
							$('<input type="text" name="PubUrl" id="PubUrl">').addClass('PubUrl').val("http://10.10.1.187:8080/MatRest/publish/refine_rdf").appendTo(pubUrlInput);
							var succes = $('<p></p>').addClass('SuccessMessage').appendTo(body);
							var footer = $('<div></div>').addClass("dialog-footer").appendTo(frame);
							$('<button></button>').addClass('button').text("Cancel").click(function() {
								DialogSystem.dismissUntil(0);
								}).appendTo(footer);
								
							//alert(theProject.metadata.name);
							//alert(document.getElementById("PubUrl").value);
							//$('#ApiKeyInput').val("9e14b68b-b39a-478d-b367-969f4c6eebf4");
							//$('#DataNameInput').val(theProject.metadata.name);
							//document.getElementById("ApiKeyInput").value = "9e14b68b-b39a-478d-b367-969f4c6eebf4";
							$('<button></button>').addClass('button').text("Publish").click(function(){RdfExporterMenuBar.publishRDF(
										document.getElementById("ApiKeyInput").value, 
										document.getElementById("DataNameInput").value, 
										document.getElementById("DataDescInput").value,
										document.getElementById("PubUrl").value)}).appendTo(footer);	
							DialogSystem.showDialog(frame);
							
						}
					}
				]
			}
			
			
	);
	DataTableColumnHeaderUI.extendMenu(function(column, columnHeaderUI, menu) {
		MenuSystem.appendTo(menu, [ "core/reconcile" ], [
		                                             {},
		                                             {
		                                                 id: "core/sindice-find-dataset",
		                                                 label: "Discover related RDF datasets..." ,
		                                                 click: function() {
		                                                     var dialog = new SindiceDialog();
		                                                     dialog.show(column);
		                                                 }
		                                             },
		                                         ]);
	});
	
	RdfReconciliationManager.synchronizeServices();
});

RdfExporterMenuBar.publishRDF = function(ApiKey, DataName, DataDesc, pubUrl) {
	if(ApiKey == ""){
		alert("You need a CKAN API Key");
	}
	else if(DataName == ""){
		alert("You need a name for your data set");
	}
	else if(DataDesc == ""){
		alert("You need a description for your data set");
	}
	else if(pubUrl == ""){
		alert("You publishing service URL");
	}
	else{
		var name = $.trim(theProject.metadata.name.replace(/\W/g, ' ')).replace(/\s+/g, '-');
		var frm = document.createElement("iframe");
		var form = document.createElement("form");
		
		//alert(pubUrl);
		/*$(form)
			.css("display", "none")
			.attr("method", "post")
			.attr("action", pubUrl)
			.attr("target", "_parent");
		$('<input />')
			.attr("name", "project")
			.attr("value", theProject.id)
			.appendTo(form);
		$('<input />')
			.attr("name", "CkanApi")
			.attr("value", ApiKey)
			.appendTo(form);
		$('<input />')
			.attr("name", "DataName")
			.attr("value", DataName)
			.appendTo(form);
		$('<input />')
			.attr("name", "DataDesc")
			.attr("value", DataDesc)
			.appendTo(form);
		frm.appendChild(form);*/
		
		
		var loadingFrame = DialogSystem.createDialog();
		var header = $('<div></div>').addClass("dialog-header").text("Publishing").appendTo(loadingFrame);
		var body = $('<div><img src="images/small-spinner.gif">Sending Request, Please Wait...</div>').addClass("loading-body").appendTo(loadingFrame);
		loadingFrame.width("400px");
		DialogSystem.showDialog(loadingFrame);
		$.ajax({
			type: "POST",
			url:pubUrl,
			data: {project: theProject.id, CkanApi:ApiKey, DataName:DataName, DataDesc:DataDesc},
			dataType:'json',
			crossDomain: true
			
		}).done(function(msg){
			alert("Publish Successful");
			console.log(msg);
			DialogSystem.dismissUntil(0);
		}).error(function(msg){
			alert(msg.responseText);
			console.log(msg);
			DialogSystem.dismissUntil(0);
		});
		
		//myWin = window.open("about:blank", "gridworks-export");
		//myWin.close();
		//form.submit();

		//document.body.removeChild(form);
		
		//DialogSystem.dismissUntil(0);
		
		/*function createRequestObject() {
			var ro = false;
			if (window.XMLHttpRequest) {             // Mozilla, Safari, ...
			  ro = new XMLHttpRequest();
			} else if (window.ActiveXObject) {       // IE < 7.0
			  try {
				ro = new ActiveXObject("Msxml2.XMLHTTP");
			  } catch (e) {
				try {
				  ro = new ActiveXObject("Microsoft.XMLHTTP");
				} catch (e) { }
			  }
			}
			return ro;
		}
		var http = createRequestObject();
		if(http){
			
			http.open('POST', pubUrl);
			http.setRequestHeader("Access-Control-Allow-Origin","*");
			http.send("project=" + theProject.id + "&CkanApi=" + ApiKey + "&DataName=" + DataName + "&DataDesc" + DataDesc + "&output=json");
			http.onreadystatechange = function() {
				
				if(http.readyState == 4 && http.status==200){
					alert(http.status);
				}
				else if(http.readyState > 4 || http.readyState < 0){
					alert("Failure :(");
				}
			}
		}*/

		
		
	}
    
};

