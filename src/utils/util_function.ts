import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
// import axios from 'axios';
import { Ollama } from "@langchain/ollama";

const model = new Ollama({
    baseUrl: "http://127.0.0.1:11434", // Your local Ollama server
    model: "GitHelper:latest", // Your local model name
});

export async function fetchGitLog(workspacePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec('git log --oneline --graph --decorate --all', { cwd: workspacePath }, (err, stdout) => {
            if (err) {
                reject(err);
            } else {
                resolve(stdout);
            }
        });
    });
}

export async function gitClone(website: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`git clone ${website}`, (err, stdout, stderr) => {
            if (err) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

export async function gitStatus(workspacePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec('git status', { cwd: workspacePath }, (err, stdout, stderr) => {
            if (err) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

export async function gitLog(workspacePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec('git log', { cwd: workspacePath }, (err, stdout, stderr) => {
            if (err) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

export async function getGitRecommendation(workspacePath: string, userMessage:string): Promise<string> {
    const status = await gitStatus(workspacePath);
    const log = await gitLog(workspacePath);
    const content = `${status}\n${log}\n the question user give you is${userMessage} \n Given the above git history and git log and user input, what should I do next?`;

    const response = await model.invoke([["system", "GitHelper"],
        ["user", content],]);

    return response;
}