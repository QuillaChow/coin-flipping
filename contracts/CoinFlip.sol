pragma solidity >= 0.5.0 <0.7.0;

contract CoinFlip{
    address payable bank;
    uint bet_amount;
    mapping(uint => address payable) public players;
    address[] participants;

    struct Bet{
        uint time;
        uint amount;
        uint bet_num;
        uint approve;
        bytes32 hash_value;
    }
    mapping(uint => Bet) bets;

    uint id_count;
    uint public game_status; // 0: no game 1: phase one 2: phase two 3: waiting for transfer

    //uint wait_time;
    //uint start_time1;
    //uint start_time2;

    constructor() public {
        bank = msg.sender;
        id_count = 1;
        game_status = 0;
        bet_amount = 0;

        //wait_time = 120;
        //start_time1 = 0;
        //start_time2 = 0;
    }

    event Game(uint operator, address[] joins, uint operation, uint msg, bytes32 hash, uint indexed time);


    /*function for players*/

    function JoinGame() public {
        require(game_status == 0, "Cannot join game now!");
        require(msg.sender != bank, "Bank cannot join game!");
        for (uint i = 1; i < id_count; ++i) {
            require(players[i] != msg.sender, "You are already in game!");
        }
        players[id_count] = msg.sender;
        participants.push(msg.sender);
        id_count += 1;
    }

    // round one
    function AddBet(bytes32 hash_value) public payable{
        require(game_status == 1, "Cannot bet now!");
        uint id = getId(msg.sender);
        require(id != 0, "Your are not a player!");
        require(msg.value == bet_amount, "Please send correct money!");
        bets[id] = Bet(now, msg.value, 0, 0, hash_value);
        //event
        emit Game(id, participants, 1, 0, hash_value, now);
        // judge
        if (ifPhase1Fin()) {
            game_status = 2;
            //start_time2 = now;
        }

    }

    // round two
    function AddResult(uint x, string memory y) public{
        require(game_status == 2 , "Cannot add result now!");
        uint id = getId(msg.sender);
        require(id != 0, "Your are not a player!");
        bytes32 hash_x = keccak256(abi.encodePacked(y));
        require(hash_x == bets[id].hash_value, "Wrong number!");
        bets[id].approve = 1;
        bets[id].bet_num = x;
        emit Game(id, participants, 2, x, "", now);
        // judge
        if (ifPhase2Fin()) {
            game_status = 3;
        }
    }


    /*function for bank*/

    modifier mustBeBank{
        require(msg.sender == bank, "only Bank can do this!");
        _;
    }

    function startGame(uint bet_value) public mustBeBank{
        require(game_status == 0, "Cannot start a new game now!");
        require(id_count > 2, "Do not have engough players!");
        game_status = 1;
        //start_time1 = now;
        bet_amount = bet_value;
        //wait_time = limit_time;
        emit Game(0, participants, 0, bet_value, "", now);
    }

    function pendResult() public mustBeBank payable{
        require(game_status != 0, "Do not need to pend");
        if (game_status == 1) {
            for (uint i = 1; i < id_count; ++i) {
                if (bets[i].amount > 0) {
                    players[i].transfer(bets[i].amount);
                    bets[i].amount = 0;
                }
            }
            delete participants;
            emit Game(0, participants, 1, 0, "", now);

        }
        else if (game_status == 2) {
            for (uint i = 1; i < id_count; ++i) {
                if (bets[i].amount > 0) {
                    players[i].transfer(bets[i].amount);
                    bets[i].amount = 0;
                    bets[i].approve = 0;
                }
            }
            delete participants;
            emit Game(0, participants, 2, 0, "", now);
        }
        else if (game_status == 3) {
            uint winner = getWinner();
            //uint total = address(this).balance;
            uint total = 0;
            for (uint i = 1; i < id_count; ++i) {
                total += bets[i].amount;
            }
            uint winnum = total * 95 / 100;
            players[winner].transfer(winnum);
            for (uint i = 1; i < id_count; ++i) {
                bets[i].amount = 0;
                bets[i].approve = 0;
            }
            delete participants;
            emit Game(0, participants, 3, winner, "", now);
            bank.transfer(total - winnum);
        }
        id_count = 1;
        game_status = 0;
        //bank.transfer(address(this).balance);
    }


    /*public function*/

    function getWinner() public view returns(uint){
        require(game_status == 3, "Canot get winner yet!");
        uint result = 0;
        for (uint i = 1; i < id_count; ++i) {
            result += bets[i].bet_num;
        }
        uint id = result % (id_count - 1);
        return id + 1;
    }

    function getId() public view returns(uint){
        for (uint i = 1; i < id_count; ++i) {
            if(players[i] == msg.sender) {
                return i;
            }
        }
        return 0;
    }

    function getBank() public view returns(address) {
        return bank;
    }

    function getGameStatus() public view returns(uint, uint) {
        if (game_status == 0) {
            return (0, id_count - 1 );
        }
        else if(game_status == 1) {
            return (1, bet_amount);
        }
        else if(game_status == 2) {
            return (2, 0);
        }
        else if(game_status == 3) {
            return (3, getWinner());
        }
    }


    /*auxiliary function*/

    function ifPhase1Fin() private view returns(bool) {
        for (uint i = 1; i < id_count; ++i) {
            if (bets[i].amount == 0) {
                return false;
            }
        }
        return true;
    }

    function ifPhase2Fin() private view returns(bool) {
        for (uint i = 1; i < id_count; ++i) {
            if (bets[i].approve == 0) {
                return false;
            }
        }
        return true;
    }

    function getId(address addr) private view returns(uint) {
        for (uint i = 1; i < id_count; ++i) {
            if(players[i] == addr) {
                return i;
            }
        }
        return 0;
    }



}