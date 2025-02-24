import os
import json
import re
import subprocess
from distutils.command.check import check

import requests
from openai import OpenAI
import torch
from bs4 import BeautifulSoup
# from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer, util

# load_dotenv()
client = OpenAI(base_url='http://localhost:11434/v1', api_key='llama3')
# model = SentenceTransformer("F:\\llama\\all_MiniLM-L6-v2")

PINK = '\033[95m'
CYAN = '\033[96m'
YELLOW = '\033[33m'
NEON_GREEN = '\033[92m'
RESET_COLOR = '\033[0m'
messagesReco = []

def open_file(filepath):
    with open(filepath, 'r', encoding="utf-8") as infile:
        return infile.read()


def get_relevant_context(user_input, vault_embeddings, vault_content, model, top_k=7):
    if vault_embeddings() == 0:
        return []
    input_embedding = model.encode([user_input])
    cos_scores = util.cos_sim(input_embedding, vault_embeddings)[0]
    top_k = min(top_k, len(cos_scores))
    top_indices = torch.topk(cos_scores, k=top_k)[1].tolist()
    relevant_context = [vault_content[idx].strip() for idx in top_indices]
    return relevant_context


def write_to_notes(note_content):
    with open("notes.txt", "a", encoding="utf-8") as notes_file:
        notes_file.write(note_content + "\n")
    print(CYAN + "Note wretten to notes.txt" + RESET_COLOR)


def git2(website, attachment=None):
    print("git clone")
    # body = 'website： '+website
    # print(body)
    # print(CYAN + "Git success" + RESET_COLOR)
    git_repo_url = website
    # target_directory = "/path/to/your/directory"
    #
    # os.chdir(target_directory)

    clone_command = f'git clone {git_repo_url}'
    result = subprocess.run(clone_command, shell=True, check=True, capture_output=True, text=True)


    if subprocess.run(["git", "status"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
        print(CYAN + "Git success" + RESET_COLOR)
    else:
        print(CYAN + "Git success" + RESET_COLOR)
    content = result.stdout
    content = content + "\n"
    with open('example.txt', 'a', encoding='utf-8') as file:
        file.write(content)

def gitStatus(path, attachment=None):
    print("git status")

    target_directory = path

    os.chdir(target_directory)

    status_command = f'git status'
    log_command = f'git log'
    result = subprocess.run(status_command, shell=True, check=True, capture_output=True, text=True)
    content = result.stdout
    content = content + "\n"
    log_result = subprocess.run(log_command, shell=True, check=True, capture_output=True, text=True)
    log_content = log_result.stdout
    log_content = log_content + "\n"
    with open('history.txt', 'a', encoding='utf-8') as file:
        file.write(content)
    print(content)
    with open('log.txt', 'a', encoding='utf-8') as file:
        file.write(log_content)
    print(log_content)
    if subprocess.run(["git", "status"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
        print(CYAN + "Git success" + RESET_COLOR)
    else:
        print(CYAN + "Git success" + RESET_COLOR)


def gitReco():
    messagesReco = []
    with open('log.txt', 'r', encoding='utf-8') as file:
        content = file.read()
    with open('history.txt', 'r', encoding='utf-8') as file:
        logcontent = file.read()
    content = content + "\n" + logcontent
    ques = "\nGiven the above git history, what should I do next\n"
    content = content + ques
    messagesReco.insert(0, {"role": "user", "content": content})
    response = client.chat.completions.create(model="llama3", messages=messagesReco, functions=functions, temperature=0)
    messages_content = response.choices[0].message.content
    print(messages_content)


def convert_to_gitclone_function(func):
    return {
        "name": func.__name__,
        "description": func.__doc__,
        "parameters": {
            "type": "object",
            "properties": {
                "website": {"type": "string"}
            },
            "required": ["website"]
        },
    }


def convert_to_gitstatus_function(func):
    return {
        "name": func.__name__,
        "description": func.__doc__,
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string"}
            },
            "required": ["path"]
        },
    }


def convert_to_gitReco_function(func):
    return {
        "name": func.__name__,
        "description": func.__doc__,
        "parameters": {
            "type": "object",
            "properties": {

            },
        },
    }


functions = [
    convert_to_gitclone_function(git2),
    convert_to_gitstatus_function(gitStatus),
    convert_to_gitReco_function(gitReco),
    # convert_to_openai_function(git2)
]


def parse_function_call(input_str):
    match = re.search(r'<functioncall>(.*?)</functioncall>', input_str, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            return None
    return None


def chat(messages):
    system_message = f"""
    You are an AI Agent that is an expert in following instructions.
    You have access to these functions:
    {json.dumps(functions, indent=2)}
    
    If the user's input contains "git clone",extract the necessary information (website) from the input and generate a function format:
    <functioncall>{{"name": "git2","arguments": {{"website": "user_provided"}}}}</functioncall>
    Make sure to replace the placeholders (user_provided) and add ".git" behind (user_provided)
    
    If the user's input contains "git status",extract the necessary information (path) from the input. This path can be either absolute or relative, such as the folder name.Then generate a function format:
    <functioncall>{{"name": "gitStatus","arguments": {{"path": "user_provided"}}}}</functioncall>
    Make sure to replace the placeholders (user_provided) 
    
    If the user's input contains "recommendation of git" generate a function format:
    <functioncall>{{"name": "gitReco","arguments": {{}}}}</functioncall>
    Make sure to replace the placeholders (user_provided)
    """
    messagesReco = messages
    messages.insert(0, {"role": "system", "content": system_message})
    response = client.chat.completions.create(model="llama3", messages=messages, functions=functions, temperature=0)
    messages_content = response.choices[0].message.content
    function_call = parse_function_call(messages_content)
    if function_call:
        function_name = function_call["name"]
        function_arguments = function_call["arguments"]
        if function_name == "git2":
            git2(**function_arguments)
            return "Git successfully!"
        if function_name == "gitStatus":
            gitStatus(**function_arguments)
            return "This is git status"
        if function_name == "gitReco":
            gitReco(**function_arguments)
            return "This is git Recommendation"
    return messages_content


conversation_history = []
while True:
    user_input = input(NEON_GREEN + "User: " + RESET_COLOR)
    # conversation_history = conversation_history[-1:]
    conversation_history.append({"role": "user", "content": user_input})
    response = chat(conversation_history)
    conversation_history.append({"role": "assistant", "content": response})
    print(YELLOW + "Assistant:" + RESET_COLOR, response)
