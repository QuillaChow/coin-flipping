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
        setInterval(App.getPlayerBalance, 1000);
        $(document).on('click', '#joinGame', App.joinGame);
        $(document).on('click', '#random', App.getRandom);
        $(document).on('click', '#computeHash', App.computeHash);
        $(document).on('click', '#sendHash', App.sendHash);
        $(document).on('click', '#sendNumber', App.sendNumber);
        $(document).on('click', '#getRecord', App.getRecords);
    },

    getPlayerBalance: function() {
        console.log("Getting player balance");
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            web3.eth.getBalance(account,function(error,res){
                if(error){
                    console.log("Get failure");
                }
                else{
                    //console.log(res);
                    $('#playerBalance').text(web3.fromWei(res, "ether"));
                }
            });
        });
    },

    getGameInfo: function() {
        console.log("Getting game info");
        var CoinFlipInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.CoinFlip.deployed().then(function(instance) {
                CoinFlipInstance = instance;
                CoinFlipInstance.getId({from: account}).then(function (result) {
                    if (result == 0) {
                        $('#gameInfo').html("Your are not in the game.");
                    }
                    else {
                        CoinFlipInstance.getGameStatus().then(function (result) {
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
                    }
                });
            });
        });
    },

    joinGame: function() {
        console.log("Joining game");
        var CoinFlipInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            else {
                var account = accounts[0];
                App.contracts.CoinFlip.deployed().then(function(instance) {
                    CoinFlipInstance = instance;
                    //CoinFlipInstance.JoinGame({from: account});
                    CoinFlipInstance.JoinGame({from: account}).then(function (result) {
                        console.log("Join successfully");
                    }).catch(function(err) {
                        console.log(err.message);
                    });
                });
            }
        });

    },

    getRandom: function() {
        var num = Math.floor(Math.random() * 10);
        $('#betNum1').val(num);
        $('#betNum2').val(num);
    },

    computeHash: function() {
        var num = $('#betNum1').val();
        if (num.length == 0) {
            return;
        }
        else {
            //console.log(betnum);
            var hashvalue = web3.sha3(num);
            //console.log(hashvalue);
            $('#hashValue').val(hashvalue);
        }
    },

    sendHash: function () {
        var hashValue = $('#hashValue').val();
        var amount = parseInt($('#betAmount').val());
        if (hashValue.length == 0) {
            return;
        }
        else {
            web3.eth.getAccounts(function(error, accounts) {
                if (error) {
                    console.log(error);
                }
                var account = accounts[0];
                App.contracts.CoinFlip.deployed().then(function(instance) {
                    CoinFlipInstance = instance;
                    return CoinFlipInstance.AddBet(hashValue,{from: account, value: web3.toWei(amount, "ether")
                    }).catch(function(err) {
                        console.log(err.message);
                    });
                });
            });
        }
    },

    sendNumber: function () {
        var number = parseInt($('#betNum2').val());
        var betnum = $('#betNum2').val();
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.CoinFlip.deployed().then(function(instance) {
                CoinFlipInstance = instance;
                return CoinFlipInstance.AddResult(number,betnum,{from: account}).catch(function(err){
                    console.log(err.message);
                });
            });
        });
    },

    getRecords: function() {
        console.log('Getting records');
        var coinFlipInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
            }
            var account = accounts[0];
            App.contracts.CoinFlip.deployed().then(function (instance) {
                coinFlipInstance = instance;
                coinFlipInstance.allEvents({
                    fromBlock: 0,
                    toBlock: "latest"
                }, function (error, events) {
                    //console.log(events.args);
                    var operator = events.args.operator;
                    var operation = events.args.operation;
                    var joins = events.args.joins;
                    var msg = events.args.msg;
                    var time = events.args.time;
                    var date = new Date(time * 1000);
                    var d = new Date();
                    var print = 0;
                    for (var i = 0; i < joins.length; ++i) {
                        if (joins[i] == account) {
                            print = 1;
                        }
                    }
                    if (print == 1 && time * 1000 > (d.getTime() - 86400000)) {
                        var text = date.toUTCString() + "&nbsp";
                        if (operator == 0) {
                            if (operation == 0) {
                                text = text + "Start a game with "+ joins.length +" players and "+ web3.fromWei(msg, "ether")+" ETH.<br/>";
                                for (var i = 0; i < joins.length; ++i) {
                                    text += "Player " + (i + 1) + ": " + joins[i] + "<br/>";
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
            }).then(function (result) {
                console.log("Get records successfully!");
            }).catch(function (err) {
                console.log(err.message);
            });
        });
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
});
