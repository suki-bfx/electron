// Create handles to the electron ipcRenderer (alias: ipc) and 'remote' APIs
const { ipcRenderer } = require('electron');

var local_json;
var online_json;

function makeIdFromUrl(url) {
    // Remove all non alpha numeric characters
    var id = url.replace(/[^a-z0-9]/gi, '');
    return id;
}

function getProductInfo(product, host, version, platform) {
    for(const p of online_json) {
        if(p["product"] != product)
            continue
        if(p["host"] != host)
            continue
        if(p["version"] != version)
            continue
        if(p["platform"] != platform)
            continue
        return p
    }
    alert("Could not find product info for " + product)
}


function getUrl(product, host, version, platform) {
    var productInfo = getProductInfo(product, host, version, platform);
    return productInfo["download_url"];
}

function getProductLine(product, host, version, platform) {
    var productInfo = getProductInfo(product, host, version, platform);
    return productInfo["product_line"];
}


ipcRenderer.on('webview_refresh', (e, args) => {
    local_json = JSON.parse(args);
    refreshProductTable(null, true);
});

ipcRenderer.on('webview_download_status', (e, args) => {
    progress = Math.floor(args["status"].percent * 100);
    var id = makeIdFromUrl(args["download_url"])
    $('#' + id).text("Downloading " + progress.toString() + "%")
});

ipcRenderer.on('webview_download_paused', (e, args) => {
    var id = makeIdFromUrl(args["download_url"])
    $('#' + id).text("Downloading Paused")
});


ipcRenderer.on('webview_uninstall_status', (e, args) => {
    var id = makeIdFromUrl(args["download_url"])
    $('#' + id).text("Uninstalling...")
    $('#' + id).removeAttr("href")
});



ipcRenderer.on('webview_download_complete', (e, args) => {
    var id = makeIdFromUrl(args["download_url"])
    $('#' + id).text("Installing...")
    $('#' + id).removeAttr("href")
});



global.pingHost = (arg) => {
  ipcRenderer.send('ping', arg)
}


function install(url, product, host, version, platform) {
    var productInfo = getProductInfo(product, host, version, platform);

    ipcRenderer.send("install", productInfo);
}

function uninstall(url, product, host, version, platform) {
    var productInfo = getProductInfo(product, host, version, platform);

    ipcRenderer.send("uninstall", productInfo);

}

var fs = require("fs");

read_file = function(path){
     return fs.readFileSync(path, 'utf8');
}

write_file = function(path, output){
    fs.writeFileSync(path, output);
}

global.refreshProductTable = (observer, fullRefresh) =>  {

    if(fullRefresh) {
        $("table tr").removeClass(".download");
    }
    $("table tr").not(".download").each(function() {

        $(this).addClass(".download")

        var product = $(this).children('td').eq(0).text();
        if(product == "")
            return;
        var host = $(this).children('td').eq(1).text();
        var version = $(this).children('td').eq(2).text();
        var platform = $(this).children('td').eq(3).text();


        // Find URL
        var url = getUrl(product, host, version, platform)

        if(observer != null)
            observer.disconnect();

        $(this).children('td').eq(5).children(0).attr("href", "#")

         var message = "Install";
        for (const p of local_json) {
            if(p["product"] == product &&
               p["host"] == host && 
               p["download_url"] != undefined && 
               p["download_url"] != "") {
                message = "Uninstall";
                if(p["version"] != version) {
                    message = "Update";
                }
                break;
            }
        }

        $(this).children('td').eq(5).children(0).unbind("click")
        $(this).children('td').eq(5).children(0).text(message);
        var id = makeIdFromUrl(url)
        $(this).children('td').eq(5).children(0).attr('id', id);
        $(this).children('td').eq(5).children(0).click(function() {
            if(message == "Uninstall")
                uninstall(url, product, host, version, platform );
            else
                install(url, product, host, version, platform );
        });

        
        var serial_number = "";
        for (const p of local_json) {
            if(p["product"] == product &&
               p["host"] == host) {
                if(p["version"] == version) {
                    if(p["serial_number"] != undefined) {
                        serial_number = p["serial_number"];
                    }
                }
                break;
            }
        }
        
        $(this).children('td').eq(4).children(0).attr("href", "#")
        if(serial_number == "") {
            $(this).children('td').eq(4).children(0).text("Buy");
        }
        else {
            $(this).children('td').eq(4).children(0).text("Serial Number");
        }
        $(this).children('td').eq(4).children(0).unbind("click")

        $(this).children('td').eq(4).children(0).click(function() {
            if(serial_number == "") {
                var productInfo = getProductInfo(product, host, version, platform);
                ipcRenderer.send("buy", productInfo);
                if(message != "Uninstall") {
                    install(url, product, host, version, platform );
                }
            }
            else {
                ipcRenderer.send("show_license", serial_number);
            }
        });

    });

}


window.addEventListener("load", pageFullyLoaded, false);
function pageFullyLoaded(e) {

    
    // Hide the extra product selectors
    $( ".branded-box" ).hide()


    // Load the local JSON
    local_json = {}
    try {
      local_json = JSON.parse(read_file("resources/install.json"));
    } catch (error) {
      local_json = {}
    }

    
    // Load the online JSON
    $.getJSON('https://borisfx.com/api/1/downloads', function(data) {
        online_json = data
    });


    // Setup trigger when table is updated
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    var index = 0;
    var observer = new MutationObserver(function(mutationList, observer) {
            index += 1;
            $( "table td button" ).hide()
            refreshProductTable(observer, false);
    });
    observer.observe(document, {
      subtree: true,
      attributes: true
      //...
    });

    // Refresh
    global.refreshProductTable(null, true);
}

