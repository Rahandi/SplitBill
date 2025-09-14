import os

import api

import discord

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

@client.event
async def on_ready():
  print(f'We have logged in as {client.user}')

@client.event
async def on_message(message):
  if message.author == client.user:
    return

  if message.content.startswith('!help'):
    help_message = """
Available commands:
!help - Show this help message
!bill get <bill_id>
!bill form
!bill submit (shift+enter then paste the form)
!bill calculate <bill_id>
!item add_participant <item_id> <participant_name>
!item remove_participant <item_id> <participant_name>
    """.strip()
    await message.reply(help_message, mention_author=True)

  if message.content.startswith('!bill form'):
    form = """
name: <bill name>
total: <total amount>
payer_name: <name of the payer>
items:
- <item name> : <item price> : [<participant1>, <participant2>, ...]
- ...
    """.strip()
    await message.reply(f"```{form}```", mention_author=True)

  if message.content.startswith('!bill get'):
    try:
      parts = message.content.split()
      if len(parts) != 3:
        await message.reply("Usage: !bill get <bill_id>", mention_author=True)
        return
      bill_id = parts[2]
      response = api.bill_get(bill_id)
      if 'error' in response:
        await message.reply(f"Error fetching bill: {response['error']}", mention_author=True)
        return
      bill = response['data']
      bill_message = f"Bill ID: `{bill['id']}`\n"
      bill_message += f"Name: `{bill['name']}`\n"
      bill_message += f"Total: `{bill['total']}`\n"
      bill_message += f"Payer: `{bill['payer']['name']}`\n"
      bill_message += "Items:\n"
      for item in bill['items']:
        participants = ', '.join([p['name'] for p in item['participants']])
        bill_message += f"- [{item['id']}] `{item['name']}` : `{item['price']}` : [{participants}]\n"
      await message.reply(bill_message, mention_author=True)
    except Exception as e:
      await message.reply(f"Error processing the command: {str(e)}", mention_author=True)
  
  if message.content.startswith('!bill submit'):
    form_content = message.content[len('!bill submit'):].strip()
    if not form_content:
      await message.reply("Please provide the filled form after the command.", mention_author=True)
      return
    
    try:
      name_line, total_line, payer_line, *item_lines = form_content.split('\n')
      bill_name = name_line.split(':', 1)[1].strip()
      total = int(total_line.split(':', 1)[1].strip())
      payer_name = payer_line.split(':', 1)[1].strip()
      items = []
      for item_line in item_lines:
        if item_line.startswith('-'):
          item_part = item_line[1:].strip()
          item_name, item_price, participants_str = item_part.split(':', 2)
          item_name = item_name.strip()
          item_price = int(item_price.strip())
          participants = [p.strip() for p in participants_str.strip().strip('[]').split(',') if p.strip()]
          items.append({
            'name': item_name,
            'price': item_price,
            'participants': participants
          })
      response = api.bill_submit(bill_name, total, payer_name, items)
      if 'error' in response:
        await message.reply(f"Error submitting bill: {response['error']}", mention_author=True)
        return
      bill_id = response['data']['id']
      await message.reply(f"Bill submitted successfully with ID: {bill_id}", mention_author=True)
    except Exception as e:
      await message.reply(f"Error processing the form: {str(e)}", mention_author=True)
  
  if message.content.startswith('!bill calculate'):
    try:
      parts = message.content.split()
      if len(parts) != 3:
        await message.reply("Usage: !bill calculate <bill_id>", mention_author=True)
        return
      bill_id = parts[2]
      response = api.bill_calculate(bill_id)
      if 'error' in response:
        await message.reply(f"Error calculating bill: {response['error']}", mention_author=True)
        return
      calculation = response['data']
      calc_message = f"Pay to: `{calculation['payer']['name']}`\n"
      calc_message += "Shares:\n"
      for person in calculation['shares']:
        calc_message += f"- `{person['name']}` owes `{person['amount']}`\n"
      await message.reply(calc_message, mention_author=True)
    except Exception as e:
      await message.reply(f"Error calculating the bill: {str(e)}", mention_author=True)
  
  if message.content.startswith('!item add_participant'):
    try:
      parts = message.content.split()
      if len(parts) != 4:
        await message.reply("Usage: !item add_participant <item_id> <participant_name>", mention_author=True)
        return
      item_id = parts[2]
      participant_name = parts[3]
      response = api.item_add_participant(item_id, participant_name)
      if 'error' in response:
        await message.reply(f"Error adding participant: {response['error']}", mention_author=True)
        return
      item = response['data']
      participants = ', '.join([p['name'] for p in item['participants']])
      item_message = f"Item ID: `{item['id']}`\n"
      item_message += f"Name: `{item['name']}`\n"
      item_message += f"Price: `{item['price']}`\n"
      item_message += f"Participants: [{participants}]\n"
      await message.reply(f"Participant added successfully.\n{item_message}", mention_author=True)
    except Exception as e:
      await message.reply(f"Error processing the command: {str(e)}", mention_author=True)

  if message.content.startswith('!item remove_participant'):
    try:
      parts = message.content.split()
      if len(parts) != 4:
        await message.reply("Usage: !item remove_participant <item_id> <participant_name>", mention_author=True)
        return
      item_id = parts[2]
      participant_name = parts[3]
      response = api.item_remove_participant(item_id, participant_name)
      if 'error' in response:
        await message.reply(f"Error removing participant: {response['error']}", mention_author=True)
        return
      item = response['data']
      participants = ', '.join([p['name'] for p in item['participants']])
      item_message = f"Item ID: `{item['id']}`\n"
      item_message += f"Name: `{item['name']}`\n"
      item_message += f"Price: `{item['price']}`\n"
      item_message += f"Participants: [{participants}]\n"
      await message.reply(f"Participant removed successfully.\n{item_message}", mention_author=True)
    except Exception as e:
      await message.reply(f"Error processing the command: {str(e)}", mention_author=True)

client.run(DISCORD_BOT_TOKEN)