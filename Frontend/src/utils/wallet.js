export const connectWallet = async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0];
  } else {
    alert("Please install Metamask");
    return null;
  }
};

export const disconnectWallet = () => {
  // No actual 'disconnect' in Metamask — just clear frontend state
};
