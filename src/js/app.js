App = {
    web3Provider: null,
    contracts: {},

    init: function() {
        return App.initWeb3();
    },

    initWeb3: function() {
        // Initialize web3 and set the provider to the testRPC.
        if (typeof web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } else {
            // set the provider you want from Web3.providers
            App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
            web3 = new Web3(App.web3Provider);
        }

        return App.initContract();
    },

    initContract: function() {
        $.getJSON('CoinFlip.json', function(data) {
            // Get the necessary contract artifact file and instantiate it with truffle-contract.
            var CoinFlipArtifact = data;
            App.contracts.CoinFlip = TruffleContract(CoinFlipArtifact);

            // Set the provider for our contract.
            App.contracts.CoinFlip.setProvider(App.web3Provider);
        });

        return App.bindEvents();
    },

    bindEvents: function() {
        setInterval(App.getGameInfo, 1000);
        setInterval(App.getBankBalance, 1000);
        $(document).on('click', '#startGame', App.startGame);
        $(document).on('click', '#endGame', App.endGame);
        $(document).on('click', '#getRecord', App.getRecords);
    },

    getBankBalance: function() {
        console.log("Getting bank balance");
        var CoinFlipInstance;
        App.contracts.CoinFlip.deployed().then(function(instance) {
            CoinFlipInstance = instance;
            //console.log(CoinFlipInstance);
            CoinFlipInstance.getBank().then(function (result) {
                web3.eth.getBalance(result,function(error,res){
                    if(error){
                        console.log("Get failure");
                    }
                    else{
                        //console.log(res);
                        $('#bankBalance').text(web3.fromWei(res, "ether"));
                    }
                });
            });
        });
    },

    getGameInfo: function() {
        console.log("Getting game info");
        var CoinFlipInstance;
        App.contracts.CoinFlip.deployed().then(function(instance) {
            CoinFlipInstance = instance;
            //var myDate = new Date();
            //var timenow = myDate.getTime() / 1000;
            //console.log(typeof timenow);
            return CoinFlipInstance.getGameStatus().then(function (result) {
                /*console.log(result);
                var date1 = new Date(result[2].c[0]*1000);
                console.log(date1.toUTCString());
                var date2 = new Date(result[3].c[0]*1000);
                console.log(date2.toUTCString());*/
                if(result[0] == 0) {
                    $('#gameInfo').html("Game not started. <br/> "+result[1]+" player(s) in game now.");
                }
                else if (result[0] == 1) {
                    let text = "Game in Round One.<br/>";
                    text += "Waiting for palyers to bet.<br/>";
                    text += "The bet amount is" + web3.fromWei(result[1],"ether") + " ETH.<br/>";
                    $('#gameInfo').html(text);
                }
                else if (result[0] == 2) {
                    let text = "Game in Round Two.<br/>";
                    text += "Waiting for palyers to send results.";
                    $('#gameInfo').html(text);
                }
                else if (result[0] == 3) {
                    $('#gameInfo').html("Game finished.<br/> The winner is Player "+result[1]);
                }
            });
        });
    },

    startGame: function() {
        //var limit_time = parseInt($('#timeLimit').val());
        var bet_amount = parseInt($('#betAmount').val());
        //console.log(limit_time);
        console.log(bet_amount);
        var CoinFlipInstance;

        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            else {
                var account = accounts[0];
                App.contracts.CoinFlip.deployed().then(function(instance) {
                    CoinFlipInstance = instance;
                    return CoinFlipInstance.startGame(web3.toWei(bet_amount,"ether"),{from: account});
                }).then(function(result) {
                    console.log("Game starts successfully!");
                }).catch(function(err) {
                    console.log(err.message);
                });
            }
        });
    },

    endGame: function(event) {
        var CoinFlipInstance;

        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            else {
                var account = accounts[0];
                App.contracts.CoinFlip.deployed().then(function(instance) {
                    CoinFlipInstance = instance;
                    return CoinFlipInstance.pendResult({from: account});
                }).then(function(result) {
                    console.log("Game ends successfully!");
                }).catch(function(err){
                    console.log(err.message);
                });
            }
        });
    },

    getRecords: function() {
        console.log('Getting records');

        var coinFlipInstance;

        App.contracts.CoinFlip.deployed().then(function(instance) {
            coinFlipInstance = instance;
            coinFlipInstance.allEvents({
                fromBlock: 0,
                toBlock: "latest"
            }, function(error, events) {
                //console.log(events.args);
                var operator = events.args.operator;
                var operation = events.args.operation;
                var joins = events.args.joins;
                var msg = events.args.msg;
                var time = events.args.time;
                var date = new Date(time*1000);
                var d = new Date();
                if (time * 1000 > (d.getTime() - 86400000)) {
                    var text = date.toUTCString()+"&nbsp";
                    if (operator == 0) {
                        if (operation == 0) {
                            text = text + "Start a game with "+ joins.length +" players and "+ web3.fromWei(msg, "ether")+" ETH.<br/>";
                            for (var i = 0; i < joins.length; ++i) {
                                text += "Player " + (i + 1) + ": " + joins[i]+"<br/>";
                            }

                        } else {
                            text = text + "End a game.";
                            if (msg != 0) {
                                text += "The winner is " + msg + ". <br/>";
                            } else {
                                text += "Game end unexpectedly. <br/>";
                            }
                        }
                        //console.log(text);
                        var preinfo = $('#tranInfo').html();
                        $('#tranInfo').html(preinfo + text);
                    } else {
                        if (operation == 1) {
                            text += "Player " + operator + " sends hash value ";
                            var hashValue = events.args.hash;
                            text += hashValue + ". ";
                        } else if (operation == 2) {
                            text += "Player " + operator + " sends bet number " + msg + ". ";
                        }
                        //console.log(text);
                        var preinfo = $('#tranInfo').html();
                        $('#tranInfo').html(preinfo + text + "<br/>");
                    }
                }
            });
        }).then(function(result) {
            console.log("Get records successfully!");
        }).catch(function(err) {
            console.log(err.message);
        });
    }

};

$(function() {
    $(window).load(function() {
        App.init();
    });
});
