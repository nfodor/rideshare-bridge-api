// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InsurancePool {
    address public admin;
    uint256 public totalContributions;

    struct Contribution {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Contribution[]) public contributions;

    event ContributionReceived(address indexed contributor, uint256 amount);
    event AdminWithdrawal(address indexed admin, uint256 amount);

    constructor() {
        admin = msg.sender;
    }

    receive() external payable {
        contribute();
    }

    function contribute() public payable {
        require(msg.value > 0, "No ETH sent");

        contributions[msg.sender].push(Contribution({
            amount: msg.value,
            timestamp: block.timestamp
        }));

        totalContributions += msg.value;
        emit ContributionReceived(msg.sender, msg.value);
    }

    function getUserTotal(address user) external view returns (uint256 total) {
        for (uint256 i = 0; i < contributions[user].length; i++) {
            total += contributions[user][i].amount;
        }
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdraw(uint256 amount) external {
        require(msg.sender == admin, "Not authorized");
        require(amount <= address(this).balance, "Insufficient funds");

        payable(admin).transfer(amount);
        emit AdminWithdrawal(admin, amount);
    }
}
