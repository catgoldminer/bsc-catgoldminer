// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UserCheckin is Ownable, Pausable {
    struct CheckIn {
        uint256 lastTimestamp;
        uint256 count;
    }

    struct TokenInfo {
        bool isSupported;
        uint256 checkInValue;
    }

    mapping(uint256 => CheckIn) public userCheckIns;
    mapping(address => TokenInfo) public supportedTokens;
    address[] public tokenList;
    uint256 public nativeTokenCheckInValue;

    event UserCheckedIn(uint256 indexed userId, address indexed token, uint256 timestamp, uint256 count);
    event TokenAdded(address indexed token, uint256 checkInValue);
    event TokenRemoved(address indexed token);
    event TokenValueUpdated(address indexed token, uint256 newValue);
    event ERC20TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event NativeTokenWithdrawn(address indexed to, uint256 amount);
    event NativeTokenCheckInValueUpdated(uint256 newValue);

    constructor(address[] memory _initialTokens, uint256[] memory _initialValues, uint256 _nativeTokenCheckInValue) {
        require(_initialTokens.length == _initialValues.length, "Mismatched array lengths");
        for (uint i = 0; i < _initialTokens.length; i++) {
            addSupportedToken(_initialTokens[i], _initialValues[i]);
        }
        nativeTokenCheckInValue = _nativeTokenCheckInValue;
    }

    function addSupportedToken(address _token, uint256 _checkInValue) public onlyOwner {
        require(!supportedTokens[_token].isSupported, "Token already supported");
        supportedTokens[_token] = TokenInfo(true, _checkInValue);
        tokenList.push(_token);
        emit TokenAdded(_token, _checkInValue);
    }

    function removeSupportedToken(address _token) external onlyOwner {
        require(supportedTokens[_token].isSupported, "Token not supported");
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

    function updateTokenCheckInValue(address _token, uint256 _newValue) external onlyOwner {
        require(supportedTokens[_token].isSupported, "Token not supported");
        supportedTokens[_token].checkInValue = _newValue;
        emit TokenValueUpdated(_token, _newValue);
    }

    function updateNativeTokenCheckInValue(uint256 _newValue) external onlyOwner {
        nativeTokenCheckInValue = _newValue;
        emit NativeTokenCheckInValueUpdated(_newValue);
    }

    function checkIn(uint256 _userId, address _token) external whenNotPaused {
        TokenInfo memory tokenInfo = supportedTokens[_token];
        require(tokenInfo.isSupported, "Token not supported");
        
        IERC20 token = IERC20(_token);
        require(token.transferFrom(msg.sender, address(this), tokenInfo.checkInValue), "ERC20 transfer failed");
        
        _recordCheckIn(_userId);
    }

    function checkInWithNativeToken(uint256 _userId) external payable whenNotPaused {
        require(msg.value == nativeTokenCheckInValue, "Incorrect native token amount");
        
        _recordCheckIn(_userId);
    }

    function _recordCheckIn(uint256 _userId) private {
        CheckIn storage userCheckIn = userCheckIns[_userId];
        userCheckIn.lastTimestamp = block.timestamp;
        userCheckIn.count++;

        emit UserCheckedIn(_userId, msg.sender, block.timestamp, userCheckIn.count);
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