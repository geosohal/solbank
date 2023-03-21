import { verify } from '@noble/ed25519';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

import { Program, AnchorProvider, web3, utils, BN } from "@project-serum/anchor"
import idl from "./solbank.json"
import {LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { connect } from 'http2';

const idl_string = JSON.stringify(idl)
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.metadata.address) // addres of program deployed on devnet

export const Bank: FC = () => {
    const ourWallet = useWallet(); // browser extension connection
    const { connection } = useConnection(); // connection settings in project provided by scaffold

    const [banks, setBanks] = useState([])

    const getProvider = () => {
        //ctor: connection to cluster where program is deployed
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        return provider
    }

    // use anchor provider to connect to program and call create function in our program
    const createBank = async () => {
        try {
            const anchProvider = getProvider()
            // reference to program imported from project serum
            const program = new Program(idl_object, programID, anchProvider)

            //find pda address from seeds we specify
            const [bank] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("bankaccount"),
                anchProvider.wallet.publicKey.toBuffer()
            ], program.programId) // bump is added automatically

            // in solbank.json create u see bank, user, systemProgram which are accounts we use here
            // awaiting confirmation
            await program.rpc.create("wsos bank", {
                accounts: {
                    bank,
                    user: anchProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId

                }
            })
            console.log("wow new bank was created: " + bank.toString())


        }
        catch (error) {
            console.log("wow new bank wasnt made, error " + error)

        }
    }

    const getBanks = async () => {
        const anchProvider = getProvider()
        const program = new Program(idl_object, programID, anchProvider)

        try {
            // get array of all accoutns associated with programID, run through ea ch account and fetch
            // data of each account
            await Promise.all((await connection.getProgramAccounts(programID)).map(async bank => ({
                ...(await program.account.bank.fetch(bank.pubkey)),
                pubkey: bank.pubkey
            }))).then( banks => {
                console.log(banks)
                setBanks(banks)
            }) 
        }
        catch (error) {
            console.log("error while getting banks")

        }
    }

    // pub key is pda of account we are gonna deposit n
    const depositBank = async (publicKey) => {
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)
            console.log("progID: " + publicKey.toString())
            await program.rpc.deposit(new BN(0.1 * LAMPORTS_PER_SOL), {
                accounts : {
                    bank: publicKey,
                    user: anchProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId
                }
            })

            console.log("Deposit done: " + publicKey)
        } catch (error) {
            console.log("Error while depositing")
        }
    }

    // pub key is pda of account we are gonna deposit n
    const withdrawBank = async (publicKey) => {
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)
            const bankAccount = await connection.getAccountInfo(programID, 'confirmed')
            const minBalForRent = await connection.getMinimumBalanceForRentExemption(bankAccount.data.length)
            const bankBalance = await connection.getBalance(programID)
            console.log("progID: " + programID.toString())
            console.log("pubkey: " + publicKey.toString())
            // withdraw 0 indicates withdraw entire balance on backend lib.rs
            await program.rpc.withdraw(new BN(bankBalance - minBalForRent), {
                accounts : {
                    bank: publicKey,
                    user: anchProvider.wallet.publicKey
                }
            })

            console.log("withdraw done: " + publicKey)
        } catch (error) {
            console.log("Error while withdraww3")
        }
    }




    return (
        <>
       {banks.map((bank) => {
        return(
            <div className="md:hero-content flex flex-col">
                <h1>{bank.name.toString()}</h1>
                <span>{bank.balance.toString()}</span>
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={() => depositBank(bank.pubkey)} 
                >
                    <span className="block group-disabled:hidden" > 
                        Deposit 0.1
                    </span>
                </button>
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={() => withdrawBank(bank.pubkey)} 
                >
                    <span className="block group-disabled:hidden" > 
                        Withdraw
                    </span>
                </button>
            </div>
        )
       })}
        <div className="flex flex-row justify-center">
            <>
            <div className="relative group items-center">
                <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={createBank} 
                >
                    <span className="block group-disabled:hidden" > 
                        Create Bank
                    </span>
                </button>

                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={getBanks} 
                >
                    <span className="block group-disabled:hidden" > 
                        Fetch Bank
                    </span>
                </button>




            </div>
            </>
        </div>
        </>
    );
};
