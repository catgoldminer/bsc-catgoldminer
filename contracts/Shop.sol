// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Shop is Ownable, Pausable {
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;

    event BuyItemWithNativeToken(string userId, string shopId, string itemId, uint256 quantity);
    event BuyItemWithERC20(string userId, string shopId, string itemId, uint256 quantity, address token, uint256 tokenAmount);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event ERC20TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event NativeTokenWithdrawn(address indexed to, uint256 amount);

    constructor(address[] memory _initialTokens) {
        for (uint i = 0; i < _initialTokens.length; i++) {
            addSupportedToken(_initialTokens[i]);
        }
    }

    function addSupportedToken(address _token) public onlyOwner {
        require(!supportedTokens[_token], "Token already supported");
        supportedTokens[_token] = true;
        tokenList.push(_token);
        emit TokenAdded(_token);
    }

    function removeSupportedToken(address _token) external onlyOwner {
        require(supportedTokens[_token], "Token not supported");
        delete supportedTokens[_token];
        for (uint i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == _token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        emit TokenRemoved(_token);
    }

    function buyItemWithNativeToken(string memory _userId, string memory _shopId, string memory _itemId, uint256 _quantity) external payable whenNotPaused {
        emit BuyItemWithNativeToken(_userId, _shopId, _itemId, _quantity);
    }

    function buyItemWithERC20(string memory _userId, string memory _shopId, string memory _itemId, uint256 _quantity, address _token, uint256 _tokenAmount) external whenNotPaused {
        require(supportedTokens[_token], "Token not supported");
        IERC20 token = IERC20(_token);
        require(token.transferFrom(msg.sender, address(this), _tokenAmount), "Transfer failed");
        emit BuyItemWithERC20(_userId, _shopId, _itemId, _quantity, _token, _tokenAmount);
    }

    function withdrawERC20Token(address _token, address _to, uint256 _amount) external onlyOwner {
        IERC20 token = IERC20(_token);
        require(token.balanceOf(address(this)) >= _amount, "Insufficient token balance");
        require(token.transfer(_to, _amount), "Transfer failed");
        emit ERC20TokenWithdrawn(_token, _to, _amount);
    }

    function withdrawNativeToken(address payable _to, uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Transfer failed");
        emit NativeTokenWithdrawn(_to, _amount);
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}
}