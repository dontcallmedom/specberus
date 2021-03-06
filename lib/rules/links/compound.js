
var url = require("url")
,   sua = require("../../throttled-ua");

exports.name = "links.compound";
exports.check = function (sr, done) {
    if (sr.config.validation !== "recursive") {
        sr.warning(exports.name, "skipped");
    }
    var links = [];
    if ( typeof String.prototype.startsWith != 'function' ) {
        String.prototype.startsWith = function( str ) {
            return this.substring( 0, str.length ) === str;
        }
    };

    sr.$('a[href]').each(function () {
        var parsedLink = url.parse(url.resolve(sr.url, sr.$(this).attr("href"))),
            l = parsedLink.protocol + '//' + parsedLink.host + parsedLink.pathname;
        if (l.startsWith(sr.url) && l != sr.url) links.push(l);
    });
    // sort and remove duplicates
    links = links.sort().filter(function (item, pos) {return (!pos || item != links[pos - 1]);});

    var markupService = "http://validator.w3.org/check"
    ,   cssService = "http://jigsaw.w3.org/css-validator/validator"
    ,   count = 0;
    links.forEach(function (l) {
        if (sr.config.validation === "recursive") {
            var req
            ,   reqCSS
            ,   ua = "Specberus/" + sr.version + " Node/" + process.version + " by sexy Robin"
            ,   isMarkupValid = false
            ,   isCSSValid = false;
            req = sua.get(markupService)
                     .set("User-Agent", ua)
                     .query({ uri: l, output: "json" })
                     .on('error', function(err) {
                         sr.error(exports.name, 'error', { file : l.split('/').pop(), link : l, errMsg: err});
                         count++;
                         return;
                     });

            req.end(function (err1, res) {
                if (res.header['x-w3c-validator-status'] === 'Valid') isMarkupValid = true;
                reqCSS = sua.get(cssService)
                        .set("User-Agent", ua)
                        .query({ uri: l, profile: "css3", output: "json", type: "html" })
                        .on('error', function(err) {
                            sr.error(exports.name, 'error', { file : l.split('/').pop(), link : l, errMsg: err});
                            count++;
                            return;
                        });
                reqCSS.end(function (err2, res) {
                    if (res.header['x-w3c-validator-status'] === 'Valid') isCSSValid = true;
                    if (isMarkupValid && isCSSValid) {
                        sr.info(exports.name, "link", { file : l.split('/').pop(), link : l , markup : "\u2714", css : "\u2714" });
                    }
                    else {
                        sr.error(exports.name, "link", { file : l.split('/').pop(), link : l , markup : (isMarkupValid ? "\u2714" : "\u2718") , css : (isCSSValid ? "\u2714" : "\u2718") });
                    }
                    count++;
                    if (count === links.length - 1) return done();
                });
            });
        }
        else {
            sr.info(exports.name, "no-validation", { file : l.split('/').pop(), link : l });
        }
    });
    if (sr.config.validation !== "recursive") done();
};
