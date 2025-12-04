// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IUniswapV2FactoryMinimal {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2PairMinimal {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address src, address dst, uint256 wad) external returns (bool);
}

contract UniswapV2Router02Minimal {
    address public immutable factory;
    address public immutable WETH;

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH);
    }

    function _pairFor(address tokenA, address tokenB) internal view returns (address pair) {
        pair = IUniswapV2FactoryMinimal(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "PAIR_NOT_EXISTS");
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        require(block.timestamp <= deadline, "EXPIRED");
        address pair = IUniswapV2FactoryMinimal(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IUniswapV2FactoryMinimal(factory).createPair(tokenA, tokenB);
        }

        amountA = amountADesired;
        amountB = amountBDesired;

        require(amountA >= amountAMin, "INSUFFICIENT_A");
        require(amountB >= amountBMin, "INSUFFICIENT_B");

        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);

        liquidity = IUniswapV2PairMinimal(pair).balanceOf(address(this));
        IUniswapV2PairMinimal(pair).transfer(to, liquidity);
    }
}
